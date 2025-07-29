const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ChannelType } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
});

const userData = new Collection();
const rateLimits = new Collection();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.content === '!start' && message.author.bot === false) {
        await message.channel.send('Please provide your user token.');
        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async collected => {
            const userToken = collected.content;
            try {
                const testClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
                await testClient.login(userToken);
                const me = await testClient.users.fetch(message.author.id);
                await testClient.destroy();
                if (!me) {
                    throw new Error('Invalid token');
                }
            } catch (error) {
                return message.channel.send('Invalid user token. Please provide a valid token.');
            }

            const userClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
            await userClient.login(userToken);
            const guilds = userClient.guilds.cache.map(guild => `${guild.id}: ${guild.name}`).join('\n');
            await message.channel.send(`Which server do you want to send your message to?\n${guilds}`);

            const serverCollector = message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

            serverCollector.on('collect', async collected => {
                const serverId = collected.content.split(':')[0].trim();
                const guild = userClient.guilds.cache.get(serverId);
                if (!guild) {
                    return message.channel.send('Server not found. Please provide a valid server ID.');
                }

                await message.channel.send('What message do you want to send?');

                const messageCollector = message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

                messageCollector.on('collect', async collected => {
                    const messageContent = collected.content;

                    await message.channel.send('What about the time interval? (in seconds)');

                    const intervalCollector = message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

                    intervalCollector.on('collect', async collected => {
                        const messageInterval = parseInt(collected.content, 10);
                        if (isNaN(messageInterval) || messageInterval <= 0) {
                            return message.channel.send('Invalid interval. Please provide a positive number.');
                        }

                        userData.set(message.author.id, {
                            token: userToken,
                            serverId: serverId,
                            channelId: null, // Channel ID will be set later
                            message: messageContent,
                            messageInterval: messageInterval
                        });

                        const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map((c, id) => `${id}: ${c.name}`).join('\n');
                        await message.channel.send(`Which channel do you want to send your messages to?\n${channels}`);

                        const channelChoiceCollector = message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

                        channelChoiceCollector.on('collect', async collected => {
                            const chosenChannelId = collected.content.split(':')[0].trim();
                            const chosenChannel = guild.channels.cache.get(chosenChannelId);
                            if (!chosenChannel || chosenChannel.type !== ChannelType.GuildText) {
                                return message.channel.send('Invalid channel choice. Please try again.');
                            }

                            userData.get(message.author.id).channelId = chosenChannelId;

                            await message.channel.send('Details submitted successfully!');

                            // Start sending messages
                            startSendingMessages(guild, chosenChannelId, messageInterval, userToken, messageContent);
                        });
                    });
                });
            });
        });
    }
});

function startSendingMessages(guild, channelId, messageInterval, userToken, message) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    setInterval(async () => {
        if (rateLimits.has(channelId)) {
            const lastSent = rateLimits.get(channelId);
            const now = Date.now();
            if (now - lastSent < 5000) { // 5-second cooldown
                return;
            }
        }

        try {
            const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
            await client.login(userToken);
            await channel.send(message);
            await client.destroy();
            rateLimits.set(channelId, Date.now());
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, messageInterval * 1000);
}

client.login(process.env.TOKEN);
