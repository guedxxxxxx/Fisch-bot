const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ], partials: [Partials.Channel] });

const GUEDX_ID = '955969285686181898'; // Support user ID
const LTC_ADDRESS = 'ltc1qr3lqtfc4em5mkfjrhjuh838nnhnpswpfxtqsu8';

const userTickets = new Map(); // userId => channelId
const userOrders = new Map();  // userId => totalPrice (Robux)
const userItems = new Map();   // userId => [{name, emoji, price}]
const userEmbeds = new Map();  // userId => messageId of ticket embed

const PRICES = {
  fishes: { 'ss_nessie': 20, 'ss_phantom_megalodon': 15, 'megalodon': 5, 'ancient_megalodon': 7, 'northstar_serpent': 10, 'whale_shark': 5, 'kraken': 10, 'orca': 10 },
  money: 20, relics: 20, totems: 40,
  rods: { 'rod_of_the_depths': 50, 'trident_rod': 60, 'heavens_rod': 55, 'kraken_rod': 55, 'poseidon_rod': 50, 'great_rod_of_oscar': 50, 'ethereal_prism_rod': 60, 'tempest_rod': 55 }
};

const GAMEPASS_LINKS = {
  5: ['https://www.roblox.com/game-pass/31127384/Donate'], 7: ['https://www.roblox.com/game-pass/31127094/Donate'],
  10: ['https://www.roblox.com/game-pass/31127528/Donate'], 15: ['https://www.roblox.com/game-pass/31127845/Donate'],
  20: ['https://www.roblox.com/game-pass/31168454/Donate'], 30: ['https://www.roblox.com/game-pass/1033147082/30'],
  40: ['https://www.roblox.com/game-pass/1027394973/40'], 50: ['https://www.roblox.com/game-pass/1031209691/50'],
  55: ['https://www.roblox.com/game-pass/1031209691/50'], 60: ['https://www.roblox.com/game-pass/1033311218/60'],
  100: ['https://www.roblox.com/game-pass/31588015/Big-Donation'], 200: ['https://www.roblox.com/game-pass/1028527085/200'],
  300: ['https://www.roblox.com/game-pass/1032509615/300'], 400: ['https://www.roblox.com/game-pass/1027496860/400']
};

const categories = [
  { label: 'Fishes', value: 'fishes', emoji: '🐟' },
  { label: 'Money', value: 'money', emoji: '💰' },
  { label: 'Relics', value: 'relics', emoji: '🗿' },
  { label: 'Rods', value: 'rods', emoji: '🎣' },
  { label: 'Aurora Totems', value: 'totems', emoji: '🪔' }
];

const products = {
  fishes: [ { label: 'SS Nessie', value: 'ss_nessie', emoji: '🐟' }, { label: 'SS Phantom Megalodon', value: 'ss_phantom_megalodon', emoji: '🐟' }, { label: 'Megalodon', value: 'megalodon', emoji: '🐟' }, { label: 'Ancient Megalodon', value: 'ancient_megalodon', emoji: '🐟' }, { label: 'Northstar Serpent', value: 'northstar_serpent', emoji: '🐟' }, { label: 'Whale Shark', value: 'whale_shark', emoji: '🐟' }, { label: 'Kraken', value: 'kraken', emoji: '🐟' }, { label: 'Orca', value: 'orca', emoji: '🐟' } ],
  money: [ { label: '1 Million', value: '1_million', emoji: '💰' }, { label: '5 Million', value: '5_million', emoji: '💰' }, { label: '10 Million', value: '10_million', emoji: '💰' }, { label: '20 Million', value: '20_million', emoji: '💰' }, { label: '30 Million', value: '30_million', emoji: '💰' }, { label: '40 Million', value: '40_million', emoji: '💰' }, { label: '50 Million', value: '50_million', emoji: '💰' } ],
  relics: [ { label: '100 Relics', value: '100_relics', emoji: '🗿' }, { label: '500 Relics', value: '500_relics', emoji: '🗿' }, { label: '1000 Relics', value: '1000_relics', emoji: '🗿' }, { label: '1500 Relics', value: '1500_relics', emoji: '🗿' }, { label: '2000 Relics', value: '2000_relics', emoji: '🗿' } ],
  totems: [ { label: '5 Totems', value: '5_totems', emoji: '🪔' }, { label: '10 Totems', value: '10_totems', emoji: '🪔' }, { label: '15 Totems', value: '15_totems', emoji: '🪔' }, { label: '20 Totems', value: '20_totems', emoji: '🪔' }, { label: '25 Totems', value: '25_totems', emoji: '🪔' }, { label: '30 Totems', value: '30_totems', emoji: '🪔' } ],
  rods: [ { label: 'Rod of the Depths', value: 'rod_of_the_depths', emoji: '🎣' }, { label: 'Trident Rod', value: 'trident_rod', emoji: '🎣' }, { label: "Heaven's Rod", value: 'heavens_rod', emoji: '🎣' }, { label: 'Kraken Rod', value: 'kraken_rod', emoji: '🎣' }, { label: 'Poseidon Rod', value: 'poseidon_rod', emoji: '🎣' }, { label: 'Great Rod of Oscar', value: 'great_rod_of_oscar', emoji: '🎣' }, { label: 'Ethereal Prism Rod', value: 'ethereal_prism_rod', emoji: '🎣' }, { label: 'Tempest Rod', value: 'tempest_rod', emoji: '🎣' } ]
};

function getPrice(category, value) {
  if (category === 'fishes') return PRICES.fishes[value] || 20;
  if (category === 'money') return parseInt(value.split('_')[0]) * PRICES.money;
  if (category === 'relics') return (parseInt(value.split('_')[0]) / 100) * PRICES.relics;
  if (category === 'totems') return (parseInt(value.split('_')[0]) / 5) * PRICES.totems;
  if (category === 'rods') return PRICES.rods[value] || 50;
  return 20;
}

function robuxToDollars(robux) { return (robux * 0.0125).toFixed(2); }
function getGamepassLinksForPrice(price) { return GAMEPASS_LINKS[price] || []; }

client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content === '!fischshop') {
    const button = new ButtonBuilder().setCustomId('open_menu').setLabel('Select Your Product').setStyle(ButtonStyle.Primary);
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
      const menu = new StringSelectMenuBuilder().setCustomId('category_select').setPlaceholder('Choose a category').addOptions(categories);
      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.reply({ content: 'Select a category:', components: [row], ephemeral: true });
    }
  }

  if (interaction.isStringSelectMenu()) {
    const selectedId = interaction.customId;
    if (selectedId === 'category_select') {
      const selectedCategory = interaction.values[0];
      const menu = new StringSelectMenuBuilder()
        .setCustomId('product_select')
        .setPlaceholder(`Select a product from ${selectedCategory}`)
        .addOptions(products[selectedCategory]);
      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.update({ content: `Select a product from ${selectedCategory}:`, components: [row] });
    }

    if (selectedId === 'product_select') {
      const user = interaction.user;
      const guild = interaction.guild;
      const selectedValue = interaction.values[0];

      const category = categories.find(cat => products[cat.value].some(p => p.value === selectedValue))?.value;
      if (!category) return await interaction.update({ content: 'Product category not found.', components: [] });

      const prevList = userItems.get(user.id) || [];
      const price = getPrice(category, selectedValue);
      const productObj = products[category].find(p => p.value === selectedValue);

      const newList = [...prevList, { ...productObj, price }];
      userItems.set(user.id, newList);

      const total = newList.reduce((acc, item) => acc + item.price, 0);
      userOrders.set(user.id, total);

      const productListText = newList.map(p => `${p.emoji} ${p.label} = ${p.price} Robux ($${robuxToDollars(p.price)})`).join('\n');
      let gamepassLinksText = '';
      newList.forEach(item => {
        const links = getGamepassLinksForPrice(item.price);
        if (links.length > 0) gamepassLinksText += `\n🔗 [Click here to buy the gamepass for ${item.label} (${item.price} Robux)](${links[0]})`;
      });

      const embed = {
        title: '🛒 Order Summary',
        description: `${productListText}\n\n📦 Total: ${total} Robux ($${robuxToDollars(total)})\n\n⚠️ **Important:** If you're buying multiple of the same item, you must buy, delete it from your Roblox inventory, and buy again — otherwise Roblox won't let you purchase twice.`,
        color: 0x00b0f4
      };

      const paymentEmbed = {
        title: '💳 Payment Information',
        description: `**Payment methods:** 🔸 LTC: ${LTC_ADDRESS}\n${gamepassLinksText}\n\nSupport will join in 1–2 minutes.`,
        color: 0xffd700,
        thumbnail: { url: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png' }
      };

      const closeButton = new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger);
      const copyLTCButton = new ButtonBuilder().setCustomId('copy_ltc').setLabel('Copy LTC Address').setStyle(ButtonStyle.Secondary);
      const buttonsRow = new ActionRowBuilder().addComponents(closeButton, copyLTCButton);

      const existingChannelId = userTickets.get(user.id);
      const existingChannel = existingChannelId ? guild.channels.cache.get(existingChannelId) : null;

      if (existingChannel) {
        const embedMsgId = userEmbeds.get(user.id);
        const embedMsg = await existingChannel.messages.fetch(embedMsgId);
        await embedMsg.edit({ embeds: [embed, paymentEmbed], components: [buttonsRow] });
        await interaction.update({ content: '✅ Product added to your order!', components: [] });
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
        const message = await channel.send({ content: `<@${GUEDX_ID}>`, embeds: [embed, paymentEmbed], components: [buttonsRow] });
        userTickets.set(user.id, channel.id);
        userEmbeds.set(user.id, message.id);
        await interaction.update({ content: '✅ Ticket created and product added!', components: [] });
      }

      const moreMenu = new StringSelectMenuBuilder().setCustomId('additional_purchase').setPlaceholder('Anything else?').addOptions([{ label: 'Yes', value: 'yes', emoji: '👍' }, { label: 'No', value: 'no', emoji: '✖️' }]);
      const moreRow = new ActionRowBuilder().addComponents(moreMenu);
      await interaction.followUp({ content: 'Do you want to purchase anything else?', components: [moreRow], ephemeral: true });
    }

    if (selectedId === 'additional_purchase') {
      const choice = interaction.values[0];
      if (choice === 'no') await interaction.update({ content: '✅ Your ticket has been successfully created! Our support will contact you soon.', components: [] });
      else {
        const menu = new StringSelectMenuBuilder().setCustomId('category_select').setPlaceholder('Choose a category').addOptions(categories);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.update({ content: 'Select a category:', components: [row] });
      }
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
