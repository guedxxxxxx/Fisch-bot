const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const GUEDX_ID = '955969285686181898';
const LTC_ADDRESS = 'ltc1qr3lqtfc4em5mkfjrhjuh838nnhnpswpfxtqsu8';

const userTickets = new Map();
const userOrders = new Map();
const userItems = new Map();
const userEmbeds = new Map();

const PRICES = {
  fishes: {
    'ss_nessie': 20,
    'ss_phantom_megalodon': 15,
    'megalodon': 5,
    'ancient_megalodon': 7,
    'northstar_serpent': 10,
    'whale_shark': 5,
    'kraken': 10,
    'orca': 10
  }
};

const GAMEPASS_LINKS = {
  5: ['https://www.roblox.com/game-pass/31127384/Donate'],
  7: ['https://www.roblox.com/game-pass/31127094/Donate'],
  10: ['https://www.roblox.com/game-pass/31127528/Donate'],
  15: ['https://www.roblox.com/game-pass/31127845/Donate'],
  20: ['https://www.roblox.com/game-pass/31168454/Donate'],
  30: ['https://www.roblox.com/game-pass/1033147082/30'],
  40: ['https://www.roblox.com/game-pass/1027394973/40'],
  50: ['https://www.roblox.com/game-pass/1031209691/50'],
  55: ['https://www.roblox.com/game-pass/1031209691/50'], // reuse 50 for 55
  60: ['https://www.roblox.com/game-pass/1033311218/60'],
  100: ['https://www.roblox.com/game-pass/31588015/Big-Donation'],
  200: ['https://www.roblox.com/game-pass/1028527085/200'],
  300: ['https://www.roblox.com/game-pass/1032509615/300'],
  400: ['https://www.roblox.com/game-pass/1027496860/400']
};

const categories = [
  { label: 'Fishes', value: 'fishes', emoji: '🐟' }
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
  ]
};

function getPrice(category, value) {
  if (category === 'fishes') return PRICES.fishes[value] || 20;
  return 20;
}

function robuxToDollars(robux) {
  return (robux * 0.0125).toFixed(2);
}

function getGamepassLinksForPrice(price) {
  return GAMEPASS_LINKS[price] || [];
}

// Split price into gamepass chunks if exact pass doesn't exist
function splitPriceToPasses(price) {
  const passes = Object.keys(GAMEPASS_LINKS).map(Number).sort((a,b) => b - a);
  let remaining = price;
  const result = [];
  for (const pass of passes) {
    while (remaining >= pass) {
      result.push(pass);
      remaining -= pass;
    }
  }
  if (remaining > 0) result.push(remaining); // fallback (shouldn't happen if passes cover all)
  return result;
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content === '!fischshop') {
    const introMsg = `🎣 **Welcome to the Fisch Shop!** 🎣

Here you can buy exclusive Roblox fishes to boost your gameplay and flex your collection!  
🛒 Select your fishes from the menu, and the total price will update automatically.

⚠️ **Important:** If you want to buy more than one of the same fish, you must buy the gamepass, delete it from your inventory, and then buy it again to add multiple copies.

💳 Payments accepted: Robux and Litecoin (LTC). Support will assist you shortly after your order.

Click the button below to start selecting your fishes. Good luck! 🐠🐟🐡`;
    const button = new ButtonBuilder()
      .setCustomId('open_menu')
      .setLabel('Select Your Fish')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    await message.channel.send({ content: introMsg, components: [row] });
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId === 'open_menu') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('product_select')
      .setPlaceholder('Choose a fish to buy')
      .addOptions(products.fishes);
    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.reply({ content: 'Select your fish from the list below:', components: [row], ephemeral: true });
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'product_select') {
    const user = interaction.user;
    const guild = interaction.guild;
    const fishId = interaction.values[0];
    const fishName = products.fishes.find(f => f.value === fishId).label;
    const fishEmoji = products.fishes.find(f => f.value === fishId).emoji;
    const price = getPrice('fishes', fishId);

    // Allow multiple of same fish: just add every selection normally (no duplicate warning)
    const currentItems = userItems.get(user.id) || [];
    currentItems.push({ name: fishName, emoji: fishEmoji, price });
    userItems.set(user.id, currentItems);

    // Calculate total price
    let total = currentItems.reduce((acc, item) => acc + item.price, 0);
    if (total > 50) total = 50; // cap max price to 50 Robux for promo

    userOrders.set(user.id, total);

    // Prepare gamepass links for total, splitting if needed
    let passes = [];
    if (GAMEPASS_LINKS[total]) {
      passes = [total];
    } else {
      passes = splitPriceToPasses(total);
    }

    const totalDollars = robuxToDollars(total);

    const orderLines = currentItems.map((item, i) => `${item.emoji} ${item.name} = ${item.price} Robux`).join('\n');

    let paymentLinksText = passes.map(p => {
      const urls = GAMEPASS_LINKS[p] || ['(No link available)'];
      return `🔗 [Buy ${p} Robux Pass](${urls[0]})`;
    }).join('\n');

    let warningText = '';
    if (passes.length > 1) {
      warningText = `⚠️ We don't have the exact pass for your total price, so you will be given multiple passes that combined equal your total.`;
    }

    const promoText = total === 50 ? `🎉 **Promo:** You hit the max price of 50 Robux!` : '';

    const orderEmbed = {
      title: '🛒 Your Fisch Shop Order',
      description: `${orderLines}\n\n📦 **Total:** ${total} Robux ($${totalDollars})\n${promoText}`,
      color: 0x00b0f4
    };

    const paymentEmbed = {
      title: '💳 Payment Information',
      description: `
⚠️ **Please wait for support to arrive before making the payment!**

**Payment Methods:**
🔸 **Litecoin (LTC):** \`${LTC_ADDRESS}\`  
🔸 **Robux Passes:**  
${paymentLinksText}

💬 Support will be here in 1–2 minutes to help you complete your purchase.`,
      color: 0xffd700,
      thumbnail: { url: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png' }
    };

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const copyLTCButton = new ButtonBuilder()
      .setCustomId('copy_ltc')
      .setLabel('Copy LTC Address')
      .setStyle(ButtonStyle.Secondary);

    const buttonsRow = new ActionRowBuilder().addComponents(closeButton, copyLTCButton);

    const existingChannelId = userTickets.get(user.id);
    const existingChannel = existingChannelId ? guild.channels.cache.get(existingChannelId) : null;

    if (existingChannel) {
      const embedMsgId = userEmbeds.get(user.id);
      try {
        const embedMsg = await existingChannel.messages.fetch(embedMsgId);
        await embedMsg.edit({ embeds: [orderEmbed, paymentEmbed], components: [buttonsRow] });
      } catch {
        // message might be deleted, ignore
      }
      await interaction.update({ content: '✅ Added your fish to the existing ticket.', components: [] });
    } else {
      const channel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: GUEDX_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const message = await channel.send({
        content: `<@${GUEDX_ID}>`,
        embeds: [orderEmbed, paymentEmbed],
        components: [buttonsRow]
      });

      userTickets.set(user.id, channel.id);
      userEmbeds.set(user.id, message.id);

      await interaction.update({ content: '✅ Ticket created with your order!', components: [] });
    }
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
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

  if (interaction.isButton() && interaction.customId === 'copy_ltc') {
    await interaction.reply({ content: `Copy this LTC address:\n\`${LTC_ADDRESS}\``, ephemeral: true });
  }
});

client.login(process.env.TOKEN);
