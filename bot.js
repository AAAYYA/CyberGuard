require('dotenv').config();
global.ReadableStream = global.ReadableStream || require('stream/web').ReadableStream;
const readline = require('readline');

const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
} = require('discord.js');
const {
    handleCommand,
    filterBlacklistedWords,
    detectAndHandleSpam,
    detectAndHandleMassJoins,
    enforceAccountAgeRestriction,
} = require('./commands.js');
const express = require('express');
const fs = require('fs');

// User ID for reaction restriction
const restrictedUserId = '428962075075674142';

const botPermissions = new Set();
const deletedMessages = new Map();

const backupFilePath = './backup.json';
if (fs.existsSync(backupFilePath)) {
    try {
        const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
        (backupData.botPermissions || []).forEach((id) => botPermissions.add(id));
    } catch (error) {
        console.error('Erreur lors du chargement des permissions du bot :', error);
    }
}

// Express Server
const app = express();
app.get('/', (req, res) => {
    res.send('Bot en cours d\'exécution !');
});
app.listen(3000, () => console.log('Serveur HTTP actif sur le port 3000'));

// Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

client.login(process.env.BOT_TOKEN);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', async (input) => {
    const parts = input.split(' ');

    if (parts[0] === 'invite' && parts.length === 3) {
        const guildId = parts[1];
        const userId = parts[2];

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.log('❌ Guild not found.');
            return;
        }

        try {
            const channel = guild.channels.cache.find(ch => 
                ch.isTextBased() && ch.permissionsFor(guild.members.me).has('CreateInstantInvite')
            );

            if (!channel) {
                console.log('❌ No valid channel found to create an invite.');
                return;
            }

            const invite = await channel.createInvite({
                maxUses: 1,
                maxAge: 3600,
                unique: true
            });

            const user = await client.users.fetch(userId);
            if (!user) {
                console.log('❌ User not found.');
                return;
            }

            await user.send(`Hey! Here is your private invite: ${invite.url}`);
            console.log(`✅ Invite sent to ${user.tag}: ${invite.url}`);

        } catch (error) {
            console.error('❌ Error creating invite or sending DM:', error);
        }

    } else if (parts[0] === 'role' && parts.length === 3) {
        const userId = parts[1];
        const roleId = parts[2];

        const guild = client.guilds.cache.first();
        if (!guild) {
            console.log('❌ Bot is not in any server.');
            return;
        }

        try {
            const member = await guild.members.fetch(userId);
            const role = guild.roles.cache.get(roleId);

            if (!role) {
                console.log("❌ Role not found.");
                return;
            }

            await member.roles.add(role);
            console.log(`✅ Role "${role.name}" has been assigned to ${member.user.tag}`);

        } catch (error) {
            console.error('❌ Error assigning role:', error);
        }

    } else {
        console.log("Available commands:");
        console.log("- invite <serverID> <userID>");
        console.log("- role <userID> <roleID>");
    }
});

const specialBannedWords = [
    "princesse", "pincceesse", "pr1ncesse", "princessee", 
    "ma val", "ma valentine", "tu me manque", "taquine", "tu me manques", "princessse",
    "prinncesse", "prinnncesse", "princcesse", "princcessse", "princesssse", "princessee",
    "princesseee", "Valchou", "Valichou", "Chérie", "Chou"
];
const additionalBannedWords = new Set();
const targetedUserId = "428962075075674142";
const botOwnerId = process.env.BOT_OWNER_ID;

function isWordBanned(content, bannedList) {
    return bannedList.some((banned) => {
        const regex = new RegExp(`\\b${banned.replace(/[aeiou]/gi, "[aeiou]*")}\\b`, "i");
        return regex.test(content);
    });
}

// Bot Events
client.once('ready', () => console.log(`Bot connecté en tant que ${client.user.tag}`));

// Automatically delete reactions from restricted user
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.id === restrictedUserId) {
        try {
            await reaction.remove();
            console.log(`Reaction removed from user: ${user.tag}`);
        } catch (error) {
            console.error('Erreur lors de la suppression de la réaction :', error);
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        const username = member.user.username.toLowerCase();

        if (username.includes('caillou')) {
            await member.kick('Nuh uh caillou.');
            console.log(`Membre expulsé : ${member.user.tag} (raison : caillou nono")`);
            return;
        }

        await enforceAccountAgeRestriction(member);
        await detectAndHandleMassJoins(member);

        const roles = {
            nomade: '1294636303744499733',
            gosse_des_rues: '1294636361067790386',
            corpo: '1294636131635171429',
        };

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`Bienvenue sur ${member.guild.name} !`)
            .setDescription(
                `${member.user}, bienvenue sur le serveur ! Merci de sélectionner votre rôle dans la liste ci-dessous :\n\n` +
                "1️⃣ **Nomade** : Voyageurs, toujours en mouvement.\n" +
                "2️⃣ **Gosse des Rues** : Malins et débrouillards.\n" +
                "3️⃣ **Corpo** : Stratèges du monde des entreprises.\n\n" +
                "Choisissez avec soin !"
            );

        const roleMenu = new StringSelectMenuBuilder()
            .setCustomId('selection_role')
            .setPlaceholder('Sélectionnez votre rôle...')
            .addOptions([
                { label: 'Nomade', description: 'Voyageurs', value: 'nomade', emoji: '🟤' },
                { label: 'Gosse des Rues', description: 'Débrouillards', value: 'gosse_des_rues', emoji: '🟠' },
                { label: 'Corpo', description: 'Stratèges', value: 'corpo', emoji: '🟢' },
            ]);

        const row = new ActionRowBuilder().addComponents(roleMenu);
        const welcomeChannelId = '1307403399607877673';
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

        if (welcomeChannel?.isTextBased()) {
            await welcomeChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (error) {
        console.error('Erreur dans guildMemberAdd:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
        console.log(`Message received from: ${message.author.tag} (ID: ${message.author.id})`);
        console.log(`Content: ${message.content}`);

        await filterBlacklistedWords(message);
        await detectAndHandleSpam(message);

        if (message.author.id === targetedUserId) {
            const lowerCaseContent = message.content.toLowerCase();

            if (
                isWordBanned(lowerCaseContent, specialBannedWords) || 
                additionalBannedWords.has(lowerCaseContent)
            ) {
                await message.delete();
                await message.author.send(`Je t'ai dit d'arrêter.`);
                console.log(`Message supprimé : "${message.content}" (Utilisateur : ${message.author.tag})`);
                return;
            }
        }

        if (message.author.id !== botOwnerId) {
            const lowerCaseContent = message.content.toLowerCase();

            if (isWordBanned(lowerCaseContent, specialBannedWords)) {
                await message.delete();
                await message.channel.send(
                    `⚠️ **${message.author.username}**, vous avez utilisé un mot interdit. Veuillez respecter les règles.`
                );
                console.log(
                    `Message supprimé contenant des mots interdits : "${message.content}" (Utilisateur : ${message.author.tag})`
                );
                return;
            }
        }

        const photoOnlyChannelIDs = ['1307120616108724275', '1294651685817290763'];
        if (photoOnlyChannelIDs.includes(message.channel.id)) {
            if (botPermissions.has(message.author.id)) return;
            if (message.hasThread) return;
            if (message.attachments.size > 0) {
                const isMedia = message.attachments.every((attachment) => {
                    const fileType = attachment.contentType || '';
                    return fileType.startsWith('image/') || fileType.startsWith('video/');
                });
                if (isMedia) return;
            }
            await message.delete().catch(console.error);
            message.author.send(
                `🚫 Seules les photos ou vidéos sont autorisées dans le canal **${message.channel.name}**. Les messages texte doivent être envoyés dans un fil.`
            ).catch(console.error);
        }

        if (message.content.startsWith('+')) {
            const args = message.content.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            await handleCommand(command, message, args, deletedMessages);
        }
    } catch (error) {
        console.error('Erreur dans messageCreate:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    try {
        if (interaction.customId === 'selection_role') {
            const roles = {
                nomade: '1294636303744499733',
                gosse_des_rues: '1294636361067790386',
                corpo: '1294636131635171429',
            };

            const roleId = roles[interaction.values[0]];
            if (roleId) {
                const role = interaction.guild.roles.cache.get(roleId);
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `🎉 Vous avez reçu le rôle **${role.name}** !`, ephemeral: true });
            }
        }
    } catch (error) {
        console.error('Erreur dans interactionCreate:', error);
    }
});

client.on('messageDelete', (message) => {
    if (message.partial || !message.guild || message.author.bot) return;

    deletedMessages.set(message.channel.id, {
        content: message.content,
        author: message.author.tag,
        timestamp: message.createdTimestamp,
    });

    setTimeout(() => deletedMessages.delete(message.channel.id), 300000);
});
