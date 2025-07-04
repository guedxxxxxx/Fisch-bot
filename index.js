const { 
  Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');
require('dotenv').config();

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], 
  partials: [Partials.Channel] 
});

const GUEDX_ID = '955969285686181898'; // Support user ID
const LTC_ADDRESS = 'ltc1qr3lqtfc4em5mkfjrhjuh838nnhnpswpfxtqsu8';

const userTickets = new Map();    // userId => channelId
const userOrders = new Map();     // userId => totalPrice (Robux)
const userItems = new Map();      // userId => [{name, emoji, price, quantity}]
const userEmbeds = new Map();     // userId => messageId of ticket embed
const userWarnings = new Map();   // userId => number of warnings

const PRICES = {
  fishes: { 
    'ss_nessie': 20, 'ss_phantom_megalodon': 15, 'megalodon': 5, 
    'ancient_megalodon': 7, 'northstar_serpent': 10, 'whale_shark': 5, 
    'kraken': 10, 'orca': 10 
  },
  money: 20, relics: 20, totems: 40,
  rods: { 
    'rod_of_the_depths': 50, 'trident_rod': 60, 'heavens_rod': 55, 
    'kraken_rod': 55, 'poseidon_rod': 50, 'great_rod_of_oscar': 50, 
    'ethereal_prism_rod': 60, 'tempest_rod': 55 
  }
};

const GAMEPASS_LINKS = {
  5: ['https://www.roblox.com/game-pass/31127384/Donate'],
  7: ['https://www.roblox.com/game-pass/31127094/Donate'],
  10: ['https://www.roblox.com/game-pass/31127528/Donate'],
  15: ['https://www.roblox.com/game-pass/31127845/Donate'],
  20: ['https://www.roblox.com/game-pass/31168454/Donate'],
  25: ['https://www.roblox.com/game-pass/31251234/Donate'],
  30: ['https://www.roblox.com/game-pass/1033147082/30'],
  40: ['https://www.roblox.com/game-pass/1027394973/40'],
  50: ['https://www.roblox.com/game-pass/1031209691/50'],
  55: ['https://www.roblox.com/game-pass/1031209691/50'],
  60: ['https://www.roblox.com/game-pass/1033311218/60'],
  75: ['https://www.roblox.com/game-pass/1027662399/75'],
  100: ['https://www.roblox.com/game-pass/31588015/Big-Donation'],
  200: ['https://www.roblox.com/game-pass/1028527085/200'],
  300: ['https://www.roblox.com/game-pass/1032509615/300'],
  400: ['https://www.roblox.com/game-pass/1027496860/400']
};

const categories = [
  { label: 'Fishes', value: 'fishes', emoji: '🐟' },
  { label: 'Money', value: 'money', emoji: '💰' },
  { label: 'Relics', value: 'relics', emoji: '🗿' },
  { label: 'Rods', value: 'rods', emoji: '🎣' },
  { label: 'Aurora Totems', value: 'totems', emoji: '🪔' }
];

const products = {
  fishes: [ 
    { label: 'SS Nessie', value: 'ss_nessie', emoji: '🐟' }, 
    { label: 'SS Phantom Megalodon', value: 'ss_phantom_megalodon', emoji: '🐟' }, 
    { label: 'Megalodon', value: 'megalodon', emoji: '🐟' }, 
    { label: 'Ancient Megalodon', value: 'ancient_megalodon', emoji: '🐟' }, 
    { label: 'Northstar Serpent', value: 'northstar_serpent', emoji: '🐟' }, 
    { label: 'Whale Shark', value: 'whale_shark', emoji: '🐟' }, 
    { label: 'Kraken', value: 'kraken', emoji: '🐟' }, 
    { label: 'Orca', value: 'orca', emoji: '🐟' } 
  ],
  money: [ 
    { label: '1 Million', value: '1_million', emoji: '💰' }, 
    { label: '5 Million', value: '5_million', emoji: '💰' }, 
    { label: '10 Million', value: '10_million', emoji: '💰' }, 
    { label: '20 Million', value: '20_million', emoji: '💰' }, 
    { label: '30 Million', value: '30_million', emoji: '💰' }, 
    { label: '40 Million', value: '40_million', emoji: '💰' }, 
    { label: '50 Million', value: '50_million', emoji: '💰' } 
  ],
  relics: [ 
    { label: '100 Relics', value: '100_relics', emoji: '🗿' }, 
    { label: '500 Relics', value: '500_relics', emoji: '🗿' }, 
    { label: '1000 Relics', value: '1000_relics', emoji: '🗿' }, 
    { label: '1500 Relics', value: '1500_relics', emoji: '🗿' }, 
    { label: '2000 Relics', value: '2000_relics', emoji: '🗿' } 
  ],
  totems: [ 
    { label: '5 Totems', value: '5_totems', emoji: '🪔' }, 
    { label: '10 Totems', value: '10_totems', emoji: '🪔' }, 
    { label: '15 Totems', value: '15_totems', emoji: '🪔' }, 
    { label: '20 Totems', value: '20_totems', emoji: '🪔' }, 
    { label: '25 Totems', value: '25_totems', emoji: '🪔' }, 
    { label: '30 Totems', value: '30_totems', emoji: '🪔' } 
  ],
  rods: [ 
    { label: 'Rod of the Depths', value: 'rod_of_the_depths', emoji: '🎣' }, 
    { label: 'Trident Rod', value: 'trident_rod', emoji: '🎣' }, 
    { label: "Heaven's Rod", value: 'heavens_rod', emoji: '🎣' }, 
    { label: 'Kraken Rod', value: 'kraken_rod', emoji: '🎣' }, 
    { label: 'Poseidon Rod', value: 'poseidon_rod', emoji: '🎣' }, 
    { label: 'Great Rod of Oscar', value: 'great_rod_of_oscar', emoji: '🎣' }, 
    { label: 'Ethereal Prism Rod', value: 'ethereal_prism_rod', emoji: '🎣' }, 
    { label: 'Tempest Rod', value: 'tempest_rod', emoji: '🎣' } 
  ]
};

function getPrice(category, value) {
  if (category === 'fishes') return PRICES.fishes[value] || 20;
  if (category === 'money') return parseInt(value.split('_')[0]) * PRICES.money;
  if (category === 'relics') return (parseInt(value.split('_')[0]) / 100) * PRICES.relics;
  if (category === 'totems') return (parseInt(value.split('_')[0]) / 5) * PRICES.totems;
  if (category === 'rods') return PRICES.rods[value] || 50;
  return 20;
}

function robuxToDollars(robux) { 
  return (robux * 0.0125).toFixed(2); 
}

// Helper to split prices into available passes
function splitPriceIntoPasses(amount) {
  // Sort passes descending
  const passes = Object.keys(GAMEPASS_LINKS).map(x => parseInt(x)).sort((a,b) => b - a);
  let remainder = amount;
  const result = [];
  for (const pass of passes) {
    while (remainder >= pass) {
      remainder -= pass;
      result.push(pass);
    }
  }
  if (remainder > 0) {
    // Could not cover full amount exactly, push smallest pass anyway
    result.push(remainder);
  }
  return result;
}

client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '!fischshop') {
    if (message.author.id !== GUEDX_ID) {
      const warns = userWarnings.get(message.author.id) || 0;
      if (warns === 0) {
        await message.reply("Do that again and I'll nut all over your face");
        userWarnings.set(message.author.id, 1);
      } else {
        await message.reply("Aaaaghh Aaaaghhhh 💦");
      }
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId('open_menu')
      .setLabel('Select Your Product')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    await message.channel.send({
      content: `🎣 Welcome to the Fisch Shop! 🎣\nWe sell fishes, rods, money, relics, and aurora totems.\n💸 Prices will appear once you select your products.\n📦 Click the button below to select a category and start buying.`,
      components: [row]
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_menu') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('Choose a category')
        .addOptions(categories);
      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.reply({ content: 'Select a category:', components: [row], ephemeral: true });
    }
    else if (interaction.customId === 'close_ticket') {
      const channel = interaction.channel;
      await interaction.reply({ content: '✅ Ticket will be closed.', ephemeral: true });
      userTickets.forEach((chId, userId) => {
        if (chId === channel.id) {
          userTickets.delete(userId);
          userOrders.delete(userId);
          userItems.delete(userId);
          userEmbeds.delete(userId);
        }
      });
      await channel.delete();
    }
    else if (interaction.customId === 'copy_ltc') {
      await interaction.reply({ content: `Copy this LTC address:\n\`${LTC_ADDRESS}\``, ephemeral: true });
    }
  }
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'category_select') {
      const selectedCategory = interaction.values[0];
      const menu = new StringSelectMenuBuilder()
        .setCustomId('product_select')
        .setPlaceholder(`Select a product from ${selectedCategory}`)
        .addOptions(products[selectedCategory]);
      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.update({ content: `Select a product from ${selectedCategory}:`, components: [row] });
    }
    else if (interaction.customId === 'product_select') {
      const selectedProduct = interaction.values[0];
      const category = Object.keys(products).find(cat =>
        products[cat].some(p => p.value === selectedProduct)
      );

      if (!category) {
        await interaction.reply({ content: 'Unknown product selected.', ephemeral: true });
        return;
      }

      if (category === 'fishes') {
        // Ask how many via modal
        const modal = new ModalBuilder()
          .setCustomId(`quantity_modal_${selectedProduct}`)
          .setTitle('Select Quantity (1 to 5)');

        const input = new TextInputBuilder()
          .setCustomId('quantity_input')
          .setLabel('How many? (max 5)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter a number from 1 to 5')
          .setRequired(true)
          .setMaxLength(1);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      } else {
        // Non-fish add 1 unit directly
        await addProductToOrder(interaction, category, selectedProduct, 1);
      }
    }
  }
  else if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId.startsWith('quantity_modal_')) {
      const productValue = interaction.customId.replace('quantity_modal_', '');
      const quantityStr = interaction.fields.getTextInputValue('quantity_input');
      const quantity = parseInt(quantityStr);
      if (isNaN(quantity) || quantity < 1 || quantity > 5) {
        await interaction.reply({ content: 'Invalid quantity. Please enter a number from 1 to 5.', ephemeral: true });
        return;
      }

      const category = Object.keys(products).find(cat =>
        products[cat].some(p => p.value === productValue)
      );

      if (!category) {
        await interaction.reply({ content: 'Unknown product in modal.', ephemeral: true });
        return;
      }

      await addProductToOrder(interaction, category, productValue, quantity);
    }
  }
});

async function addProductToOrder(interaction, category, productValue, quantity) {
  const userId = interaction.user.id;
  const productInfo = products[category].find(p => p.value === productValue);
  if (!productInfo) {
    await interaction.reply({ content: 'Product not found.', ephemeral: true });
    return;
  }

  const unitPrice = getPrice(category, productValue);
  const totalPrice = unitPrice * quantity;

  const passesNeeded = splitPriceIntoPasses(totalPrice);
  const hasExactPass = GAMEPASS_LINKS.hasOwnProperty(totalPrice);

  let warningMsg = '';
  if (!hasExactPass && passesNeeded.length > 1) {
    warningMsg = "⚠️ We don't have the exact pass for that amount, so you'll receive multiple passes that combined equal your total.\n";
  }

  let passesLinksText = passesNeeded.map(p => {
    const links = GAMEPASS_LINKS[p];
    if (!links) return `No gamepass for ${p} Robux`;
    return links.map(link => `[${p} Robux Pass](${link})`).join('\n');
  }).join('\n');

  // Store order data
  const prevItems = userItems.get(userId) || [];
  prevItems.push({ name: productInfo.label, emoji: productInfo.emoji, price: totalPrice, quantity });
  userItems.set(userId, prevItems);
  userOrders.set(userId, (userOrders.get(userId) || 0) + totalPrice);

  await interaction.reply({
    content: `${warningMsg}You added **${quantity} x ${productInfo.label}** for **${totalPrice} Robux**.\n\nGamepass links:\n${passesLinksText}`,
    ephemeral: true
  });
}

client.login(process.env.TOKEN);
