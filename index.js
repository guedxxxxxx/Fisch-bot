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

const userTickets = new Map(); // userId => channelId
const userOrders = new Map();  // userId => totalPrice
const userItems = new Map();   // userId => [{name, emoji, price}]
const userEmbeds = new Map();  // userId => ticket embed messageId

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
    { label: 'Megalodon', value: 'megalodon', emoji: '🐟' }
  ],
  money: [
    { label: '1 Million', value: '1_million', emoji: '💰' },
    { label: '5 Million', value: '5_million', emoji: '💰' }
  ],
  relics: [
    { label: '100 Relics', value: '100_relics', emoji: '🗿' },
    { label: '500 Relics', value: '500_relics', emoji: '🗿' }
  ],
  rods: [
    { label: 'Rod of the Depths', value: 'rod_of_the_depths', emoji: '🎣' },
    { label: 'Kraken Rod', value: 'kraken_rod', emoji: '🎣' }
  ],
  totems: [
    { label: '5 Totems', value: '5_totems', emoji: '🪔' },
    { label: '10 Totems', value: '10_totems', emoji: '🪔' }
  ]
};

function calculateDollarAmount(robux) {
  return (robux * 0.0125).toFixed(2);
}

function getGamepassLink(price) {
  return `https://www.roblox.com/game-pass/${1000000 + price}/Donate`;
}

client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content === '!fisch') {
    if (message.author.id !== GUEDX_ID) {
      await message.reply('Sorry, only authorized users can use this command.');
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId('open_menu')
      .setLabel('Select Your Product')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({
      content: `🎣 **Welcome to the Fisch Shop!** 🎣

We sell fishes, rods, money, relics, and aurora totems.  
💸 Select products, get prices, and pay using gamepasses or LTC.  
❗ *To buy more than one of the same product, buy, delete it, then buy again.*`,
      components: [row]
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId === 'open_menu') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('category_select')
      .setPlaceholder('Choose a category')
      .addOptions(categories);

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.reply({ content: 'Select a category:', components: [row], ephemeral: true });
  }

  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;

    if (customId === 'category_select') {
      const selectedCategory = interaction.values[0];
      const menu = new StringSelectMenuBuilder()
        .setCustomId('product_select')
        .setPlaceholder(`Select a product from ${selectedCategory}`)
        .addOptions(products[selectedCategory]);

      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.update({ content: `Choose a product from **${selectedCategory}**:`, components: [row] });
    }

    else if (customId === 'product_select') {
      const user = interaction.user;
      const guild = interaction.guild;
      const selectedProduct = interaction.values[0];
      const displayName = selectedProduct.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      const prevList = userItems.get(user.id) || [];
      const productEntry = { name: displayName, emoji: '🛒', price: 20 }; // set all at 20 robux for example
      const newList = [...prevList, productEntry];
      userItems.set(user.id, newList);

      const total = newList.reduce((sum, item) => sum + item.price, 0);
      const usd = calculateDollarAmount(total);
      userOrders.set(user.id, total);
      const robuxLink = getGamepassLink(total);

      const productListText = newList.map(p => `${p.emoji} ${p.name} = ${p.price} robux`).join('\n');
      const embed = {
        title: '🛒 Order Summary',
        description: `${productListText}\n\n📦 **Total:** ${total} robux ($${usd})`,
        color: 0x00b0f4
      };

      const paymentEmbed = {
        title: '💳 Payment Information',
        description: `
🔸 **For LTC:** \`${LTC_ADDRESS}\`
🔸 **For Robux:** [Click here to buy for ${total} Robux](${robuxLink})
💬 **Support will be here shortly.**`,
        color: 0xffd700
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
        await interaction.update({ content: '✅ Product added!', components: [] });
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
          embeds: [embed, paymentEmbed],
          components: [buttonsRow]
        });

        userTickets.set(user.id, channel.id);
        userEmbeds.set(user.id, message.id);
        await interaction.update({ content: '✅ Ticket created and product added!', components: [] });
      }

      const anythingElseMenu = new StringSelectMenuBuilder()
        .setCustomId('anything_else')
        .setPlaceholder('Do you want to buy anything else?')
        .addOptions([
          { label: 'Yes', value: 'yes', emoji: '👍' },
          { label: 'No', value: 'no', emoji: '🚫' }
        ]);
      const anythingElseRow = new ActionRowBuilder().addComponents(anythingElseMenu);

      await interaction.followUp({ content: 'Would you like to add another product?', components: [anythingElseRow], ephemeral: true });
    }

    else if (customId === 'anything_else') {
      const choice = interaction.values[0];
      if (choice === 'yes') {
        const menu = new StringSelectMenuBuilder().setCustomId('category_select').setPlaceholder('Choose a category').addOptions(categories);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.update({ content: 'Select a category:', components: [row] });
      } else {
        await interaction.update({ content: '✅ Your order is complete! Please wait for support.', components: [] });
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
