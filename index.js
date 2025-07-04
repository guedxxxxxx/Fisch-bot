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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const GUEDX_ID = '955969285686181898';
const LTC_ADDRESS = 'ltc1qr3lqtfc4em5mkfjrhjuh838nnhnpswpfxtqsu8';

const userTickets = new Map();
const userOrders = new Map();
const userItems = new Map();
const userEmbeds = new Map();

const PRICES = {
  fishes: 20,
  money: 20,
  relics: 20,
  totems: 20,
  rods: 20
};

const moneyOptions = [
  '1 Million', '5 Million', '10 Million', '20 Million',
  '30 Million', '40 Million', '50 Million'
];

const categories = [
  { label: 'Fishes', value: 'fishes', emoji: '🐟' },
  { label: 'Money', value: 'money', emoji: '💰' },
  { label: 'Relics', value: 'relics', emoji: '🗿' },
  { label: 'Rods', value: 'rods', emoji: '🎣' },
  { label: 'Aurora Totems', value: 'totems', emoji: '🪔' }
];

const products = {
  fishes: [
    'SS Nessie', 'SS Phantom Megalodon', 'Megalodon', 'Ancient Megalodon',
    'Northstar Serpent', 'Whale Shark', 'Ancient Depths Serpent', 'Kraken', 'Orca'
  ],
  relics: ['100 Relics', '500 Relics', '1000 Relics', '1500 Relics', '2000 Relics'],
  totems: ['5 Totems', '10 Totems', '15 Totems', '20 Totems', '25 Totems', '30 Totems'],
  rods: [
    'Rod of the Depths', 'Trident Rod', "Heaven's Rod", 'Kraken Rod', 'Poseidon Rod',
    'Great Rod of Oscar', 'Ethereal Prism Rod', 'Tempest Rod'
  ]
};

function toRobuxLinkPlaceholder() {
  return 'To be applied';
}

function formatPrice(price) {
  return price ? `${price} Robux` : 'To be applied';
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '!fischshop') {
    const button = new ButtonBuilder()
      .setCustomId('open_menu')
      .setLabel('Select Your Product')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({
      content:
`🎣 **Welcome to the Fisch Shop!** 🎣

We sell fishes, rods, money and everything else.
No nonsense, no levels — just clean trading.

📦 Click the button below to select your category and start buying.`,
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

    if (interaction.customId === 'close_ticket') {
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

    if (interaction.customId === 'copy_ltc') {
      await interaction.reply({
        content: `Copy this LTC address:\n\`${LTC_ADDRESS}\``,
        ephemeral: true
      });
    }
  }

  if (interaction.isStringSelectMenu()) {
    const selectedId = interaction.customId;

    if (selectedId === 'category_select') {
      const selectedCategory = interaction.values[0];
      const guild = interaction.guild;

      if (selectedCategory === 'money') {
        const moneyMenuOptions = moneyOptions.map(label => ({
          label,
          value: label.toLowerCase().replace(/ /g, '_'),
          emoji: '💰'
        }));

        const moneyMenu = new StringSelectMenuBuilder()
          .setCustomId('product_select')
          .setPlaceholder('Select money amount')
          .addOptions(moneyMenuOptions);

        const row = new ActionRowBuilder().addComponents(moneyMenu);
        await interaction.update({ content: 'Select the money amount:', components: [row] });
        return;
      }

      const list = products[selectedCategory] || [];

      const options = list.map(label => ({
        label,
        value: label.toLowerCase().replace(/ /g, '_'),
        emoji: selectedCategory === 'fishes' ? '🐟' :
               selectedCategory === 'relics' ? '🗿' :
               selectedCategory === 'totems' ? '🪔' :
               selectedCategory === 'rods' ? '🎣' : '🛒'
      }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId('product_select')
        .setPlaceholder(`Select a ${selectedCategory.slice(0, -1)}`)
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.update({ content: `Select a ${selectedCategory.slice(0, -1)}:`, components: [row] });
    }

    if (selectedId === 'product_select') {
      const user = interaction.user;
      const guild = interaction.guild;
      const selectedProduct = interaction.values[0];
      const displayName = selectedProduct.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      const productPrice = 20;

      const productEntry = { name: displayName, emoji: '🛒', price: productPrice };
      const prevList = userItems.get(user.id) || [];
      const newList = [...prevList, productEntry];
      userItems.set(user.id, newList);

      let total = newList.reduce((sum, item) => sum + item.price, 0);
      userOrders.set(user.id, total);

      const robuxLink = toRobuxLinkPlaceholder();

      const productListText = newList.map(p => `${p.emoji} ${p.name} = ${formatPrice(p.price)}`).join('\n');

      const embed = {
        title: '🛒 Order Summary',
        description: `${productListText}\n\n📦 Total: ${formatPrice(total)}`,
        color: 0x00b0f4
      };

      const paymentEmbed = {
        title: '💳 Payment Information',
        description:
`Please wait for support before paying.

**Payment methods:**  
🔸 LTC: \`${LTC_ADDRESS}\`  
🔸 Robux: ${robuxLink}

Support will join in 1–2 minutes.`,
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
        const embedMsg = await existingChannel.messages.fetch(embedMsgId);

        await embedMsg.edit({ embeds: [embed, paymentEmbed], components: [buttonsRow] });
        await interaction.reply({ content: '✅ Product added to your order!', ephemeral: true });
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

        await interaction.reply({ content: '✅ Ticket created and product added!', ephemeral: true });
      }

      const moreMenu = new StringSelectMenuBuilder()
        .setCustomId('additional_purchase')
        .setPlaceholder('Anything else?')
        .addOptions([
          { label: 'Yes', value: 'yes', emoji: '👍' },
          { label: 'No', value: 'no', emoji: '✖️' }
        ]);

      const moreRow = new ActionRowBuilder().addComponents(moreMenu);
      await interaction.followUp({ content: 'Do you want to purchase anything else?', components: [moreRow], ephemeral: true });
    }

    if (selectedId === 'additional_purchase') {
      const choice = interaction.values[0];
      if (choice === 'no') {
        await interaction.update({ content: '✅ Your ticket has been successfully created!', components: [] });
      } else {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('category_select')
          .setPlaceholder('Choose a category')
          .addOptions(categories);

        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.update({ content: 'Select a category:', components: [row] });
      }
    }
  }
});

client.login(process.env.TOKEN);
