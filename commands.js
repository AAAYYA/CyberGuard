const { PermissionsBitField, ChannelType } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const raidProtectionState = {
    joinTimestamps: new Map(),
    messageTimestamps: new Map(),
    cooldownUsers: new Set(),
};

const ticTacToeGames = new Map();

const RAID_PROTECTION_SETTINGS = {
    maxMessagesPerSecond: 5,
    joinDetectionWindow: 10000,
    maxJoinsPerWindow: 5,
    accountAgeLimit: 7,
    muteDuration: 10 * 60 * 1000,
};

const backupFilePath = './backup.json';
let valInterval = null;
const warnings = new Map();
const botPermissions = new Set();
let blacklist = new Set();

function saveBackup() {
    const data = {
        warnings: [...warnings.entries()],
        botPermissions: [...botPermissions],
        blacklist: [...blacklist],
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(data, null, 2));
}

function loadBackup() {
    if (fs.existsSync(backupFilePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
            warnings.clear();
            botPermissions.clear();
            blacklist.clear();
            for (const [key, value] of data.warnings || []) {
                warnings.set(key, value);
            }
            for (const id of data.botPermissions || []) {
                botPermissions.add(id);
            }
            for (const word of data.blacklist || []) {
                blacklist.add(word);
            }
        } catch (error) {
            console.error("Error loading backup file:", error.message);
        }
    }
}

loadBackup();

async function handleCommand(command, message, args, deletedMessages) {
    const botOwnerID = process.env.BOT_OWNER_ID;

    if (message.author.id !== botOwnerID && !botPermissions.has(message.author.id)) {
        return message.reply("❌ You don't have permission to use this bot.");
    }

    switch (command) {
        case 'lock':
            await handleLockCommand(message);
            break;
        case 'unlock':
            await handleUnlockCommand(message);
            break;
        case 'lockall':
            await handleLockdownCommand(message);
            break;
        case 'unlockall':
            await handleUnlockAllCommand(message);
            break;
        case 'val':
            await handleValCommand(message);
            break;
        case 'unval':
            await handleUnvalCommand(message);
            break;
        case 'clear':
            await handleClearCommand(message, args);
            break;
        case 'clearall':
            await handleClearAllCommand(message);
            break;
        case 'ban':
            await handleBanCommand(message, args);
            break;
        case 'kick':
            await handleKickCommand(message, args);
            break;
        case 'unban':
            await handleUnbanCommand(message, args);
            break;
        case 'warn':
            await handleWarnCommand(message, args);
            break;
        case 'snipe':
            await handleSnipeCommand(message, deletedMessages);
            break;
        case 'mute':
            await handleMuteCommand(message, args);
            break;
        case 'unmute':
            await handleUnmuteCommand(message, args);
            break;
        case 'renew':
            await handleRenewCommand(message);
            break;
        case 'warnings':
            await handleWarningsCommand(message, args);
            break;
        case 'clearwarnings':
            await handleClearWarningsCommand(message, args);
            break;
        case 'help':
            await handleHelpCommand(message);
            break;
        case 'create':
            await handleCreateEmojiCommand(message, args);
            break;
        case 'perms':
            await handlePermsCommand(message, args);
            break;
        case 'blacklist':
            await handleBlacklistWordCommand(message, args);
            break;
        case 'whitelist':
            await handleWhitelistWordCommand(message, args);
            break;
        case 'unperm':
            await handleUnpermCommand(message, args);
            break;
        case 'superlock':
    		await handleSuperLockCommand(message);
    		break;
		case 'superunlock':
    		await handleSuperUnlockCommand(message);
    		break;
        case 'owner':
            await handleOwnerCommand(message, args);
            break;
        case 'reclaim':
            await handleReclaimCommand(message);
            break;
		case 'morpion':
    		await handleTicTacToeCommand(message);
    		break;
        default:
            message.channel.send("Unknown command.");
    }
}

function saveData() {
    fs.writeFileSync('data.json', JSON.stringify(botData, null, 2));
}

async function handleSnipeCommand(message, deletedMessages) {
    const snipe = deletedMessages.get(message.channel.id);

    if (!snipe) {
        return message.channel.send("There's nothing to snipe!");
    }

    const { content, author, timestamp } = snipe;

    message.channel.send(
        `🕒 **${new Date(timestamp).toLocaleString()}**\n💬 **${author}**: ${content || "*[No content]*"}`
    );
}

async function handleUnbanCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply("You don't have permission to unban users.");
    }

    const userMention = args[0];

    if (!userMention) {
        return message.reply("Please provide a valid user ID to unban.");
    }

    try {
        await message.guild.members.unban(userMention);
    } catch (error) {
        console.error(error);
        message.channel.send('Error unbanning the user.');
    }
}

async function handleKickCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to kick users.");
    }

    const userMention = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!userMention) {
        return message.reply("Please mention a valid user to kick.");
    }
    try {
        await userMention.kick(reason);
    } catch (error) {
        console.error(error);
        message.channel.send('Error kicking the user.');
    }
}

async function handleBanCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply("You don't have permission to ban users.");
    }

    const userMention = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!userMention) {
        return message.reply("Please mention a valid user to ban.");
    }

    try {
        await userMention.ban({ reason });
    } catch (error) {
        console.error(error);
        message.channel.send('Error banning the user.');
    }
}

async function handleClearCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You don't have permission to clear messages.");
    }

    const amount = parseInt(args[0], 10);

    if (isNaN(amount) || amount <= 0 || amount > 100) {
        return message.reply("Please provide a valid number of messages to delete (1-100).");
    }

    try {
        const fetched = await message.channel.messages.fetch({ limit: amount + 1 });

        await message.channel.bulkDelete(fetched, true);
    } catch (error) {
        console.error(error);
        message.channel.send('Error clearing the messages. Please ensure the messages are less than 14 days old.');
    }
}

async function handleClearAllCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You don't have permission to clear all messages.");
    }

    try {
        let fetched;
        do {
            fetched = await message.channel.messages.fetch({ limit: 100 });
            await message.channel.bulkDelete(fetched, true);
        } while (fetched.size >= 2);
    } catch (error) {
        console.error(error);
        message.channel.send('Error clearing all messages. Please ensure messages are less than 14 days old.');
    }
}

async function handleLockCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to lock channels.");
    }

    const channel = message.channel;

    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });

        botPermissions.forEach(async (userId) => {
            const member = message.guild.members.cache.get(userId);
            if (member) {
                await channel.permissionOverwrites.edit(member, { SendMessages: true });
            }
        });

        await message.channel.send('This channel has been locked.');

        const activeThreads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived();

        activeThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
                botPermissions.forEach(async (userId) => {
                    const member = message.guild.members.cache.get(userId);
                    if (member) {
                        await thread.permissionOverwrites.edit(member, { SendMessages: true });
                    }
                });
            }
        });

        archivedThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
                botPermissions.forEach(async (userId) => {
                    const member = message.guild.members.cache.get(userId);
                    if (member) {
                        await thread.permissionOverwrites.edit(member, { SendMessages: true });
                    }
                });
            }
        });

    } catch (error) {
        console.error(error);
        message.channel.send('Error locking the channel and its threads.');
    }
}

async function handleOwnerCommand(message, args) {
    const botOwnerID = process.env.BOT_OWNER_ID;
    const targetMember = message.mentions.members.first();

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ Only the server owner can use this command.");
    }

    if (!targetMember) {
        return message.reply("❌ Please mention a valid user to make the owner.");
    }

    const ownerRoleName = 'Server Owner';
    let ownerRole = message.guild.roles.cache.find(role => role.name === ownerRoleName);
    if (!ownerRole) {
        ownerRole = await message.guild.roles.create({
            name: ownerRoleName,
            color: '#FF0000',
            permissions: ['Administrator'],
        });
    }
    await targetMember.roles.add(ownerRole);
    message.channel.send(`✅ ${targetMember.user.tag} is now the server owner.`);
}

async function handleReclaimCommand(message) {
    const botOwnerID = process.env.BOT_OWNER_ID;

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ Only the original server owner can reclaim ownership.");
    }

    const ownerRoleName = 'Server Owner';
    const ownerRole = message.guild.roles.cache.find(role => role.name === ownerRoleName);

    if (!ownerRole) {
        return message.reply("❌ No 'Server Owner' role exists to reclaim.");
    }

    const currentOwners = ownerRole.members;
    for (const [memberID, member] of currentOwners) {
        await member.roles.remove(ownerRole);
    }
    const botOwner = message.guild.members.cache.get(botOwnerID);
    if (botOwner) {
        await botOwner.roles.add(ownerRole);
        message.channel.send(`✅ You have reclaimed server ownership.`);
    } else {
        message.reply("❌ Could not find your user in the server.");
    }
}

async function handleSuperLockCommand(message) {
    const botOwnerID = process.env.BOT_OWNER_ID;

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ Only the bot owner can use this command.");
    }

    const channel = message.channel;

    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        channel.permissionOverwrites.cache.forEach(async (overwrite) => {
            const id = overwrite.id;
            if (id === botOwnerID) return;
            await channel.permissionOverwrites.edit(id, { SendMessages: false });
        });
        await channel.permissionOverwrites.edit(botOwnerID, { SendMessages: true });
        await message.reply(`🔒 The channel **${channel.name}** has been locked.`);
    } catch (error) {
        console.error('Error in super-locking the channel:', error);
        await message.reply("❌ An error occurred while trying to super-lock the channel.");
    }
}

async function handleSuperUnlockCommand(message) {
    const botOwnerID = process.env.BOT_OWNER_ID;

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ Only the bot owner can use this command.");
    }

    const channel = message.channel;

    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        channel.permissionOverwrites.cache.forEach(async (overwrite) => {
            const id = overwrite.id;
            if (id === botOwnerID) return;
            await channel.permissionOverwrites.edit(id, { SendMessages: null });
        });

        await message.reply(`🔓 The channel **${channel.name}** has been unlocked.`);
    } catch (error) {
        console.error('Error in super-unlocking the channel:', error);
        await message.reply("❌ An error occurred while trying to super-unlock the channel.");
    }
}

async function handleTicTacToeCommand(message) {
    const players = [message.author];

    const embed = new EmbedBuilder()
        .setTitle('Tic Tac Toe')
        .setDescription(`🎮 ${players[0]} commence la partie ! Cliquez sur un bouton pour jouer.`)
        .setColor(0x1abc9c);

    const board = Array(9).fill(null);
    const boardButtons = createTicTacToeButtons(board);

    const messageComponent = await message.channel.send({
        embeds: [embed],
        components: boardButtons,
    });

    ticTacToeGames.set(messageComponent.id, {
        board,
        players,
        currentPlayerIndex: 0,
        messageComponent,
    });
}

function createTicTacToeButtons(board) {
    const rows = [];

    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();

        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;
            const button = new ButtonBuilder()
                .setCustomId(`tic_tac_toe_${index}`)
                .setLabel(board[index] ? board[index] : '\u200b') // Bouton vide si pas encore joué
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!!board[index]);

            row.addComponents(button);
        }

        rows.push(row);
    }

    return rows;
}

async function handleTicTacToeInteraction(interaction) {
    if (!interaction.customId.startsWith('tic_tac_toe_')) return;

    const game = ticTacToeGames.get(interaction.message.id);
    if (!game) return interaction.reply({ content: '⛔ Cette partie n\'est plus active.', ephemeral: true });

    const { board, players, currentPlayerIndex, messageComponent } = game;
    const index = parseInt(interaction.customId.split('_')[3], 10);

    if (board[index]) {
        return interaction.reply({ content: '⛔ Ce carré est déjà pris.', ephemeral: true });
    }

    board[index] = currentPlayerIndex === 0 ? '❌' : '⭕';

    if (checkWinner(board)) {
        await interaction.update({
            content: `🎉 ${players[currentPlayerIndex]} a gagné la partie !`,
            components: [],
        });
        ticTacToeGames.delete(messageComponent.id);
        return;
    }

    if (board.every((cell) => cell)) {
        await interaction.update({
            content: '⚖️ La partie est un match nul !',
            components: [],
        });
        ticTacToeGames.delete(messageComponent.id);
        return;
    }

    game.currentPlayerIndex = 1 - currentPlayerIndex;

    const updatedButtons = createTicTacToeButtons(board);

    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setTitle('Tic Tac Toe')
                .setDescription(
                    `🎮 C'est au tour de ${players[game.currentPlayerIndex]} de jouer. Cliquez sur un bouton pour continuer.`
                )
                .setColor(0x1abc9c),
        ],
        components: updatedButtons,
    });
}

function checkWinner(board) {
    const winningCombinations = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    return winningCombinations.some(
        ([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]
    );
}

async function handleUnlockCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to unlock channels.");
    }

    const channel = message.channel;

    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        message.channel.send('This channel has been unlocked.');

        const activeThreads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived();

        activeThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            }
        });

        archivedThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            }
        });

    } catch (error) {
        console.error(error);
        message.channel.send('Error unlocking the channel and its threads.');
    }
}

async function handleLockdownCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to initiate a lockdown.");
    }

    try {
        const channels = message.guild.channels.cache;

        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false,
                });

                botPermissions.forEach(async (userId) => {
                    const member = message.guild.members.cache.get(userId);
                    if (member) {
                        await channel.permissionOverwrites.edit(member, { SendMessages: true });
                    }
                });
            }
        });

        message.channel.send("The server has been locked down. Use `+unlockall` to unlock.");
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error during the lockdown process.');
    }
}

async function handleUnlockAllCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to unlock all channels.");
    }

    try {
        const channels = message.guild.channels.cache;

        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            }
        });

        message.channel.send('All channels have been unlocked.');
    } catch (error) {
        console.error(error);
        message.channel.send('Error unlocking all channels.');
    }
}

async function handleValCommand(message) {
    const botOwnerID = process.env.BOT_OWNER_ID;

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ Only the bot owner can use this command.");
    }

    if (valInterval) {
        return message.reply("The message is already being sent every second.");
    }

    const valentinaMention = '<@1306619167452958762>';
    const valMessage = `Réponds mp ${valentinaMention}`;

    valInterval = setInterval(async () => {
        const channels = message.guild.channels.cache;

        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                try {
                    await channel.send(valMessage);
                } catch (error) {
                    console.error(`Error sending message to channel ${channel.name}:`, error);
                }
            }
        });
    }, 1000);
}

async function handleUnvalCommand(message) {
    if (!valInterval) {
        return message.reply("There is no ongoing message to stop.");
    }

    clearInterval(valInterval);
    valInterval = null;

    try {
        const channels = message.guild.channels.cache.filter(
            (channel) => channel.type === ChannelType.GuildText
        );

        for (const [channelId, channel] of channels) {
            try {
                const messages = await channel.messages.fetch({ limit: 100 });
                const botMessages = messages.filter(
                    (msg) =>
                        msg.author.bot &&
                        msg.content.includes("Réponds mp")
                );

                for (const [messageId, botMessage] of botMessages) {
                    await botMessage.delete().catch(console.error);
                }
            } catch (channelError) {
                console.error(`Error while deleting messages in channel ${channel.name}:`, channelError);
            }
        }
    } catch (error) {
        console.error("Error while cleaning up bot messages:", error);
        message.channel.send("❌ Stopped the spam but encountered an error while cleaning up the messages.");
    }
}


async function handleMuteCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("You don't have permission to mute members.");
    }

    const userToMute = message.mentions.members.first();
    const duration = args[1] ? parseInt(args[1]) : null;

    if (!userToMute) {
        return message.reply("Please mention a valid user to mute.");
    }

    if (!userToMute.moderatable) {
        return message.reply("I cannot mute this user. Ensure my role is above theirs.");
    }

    if (!duration) {
        return message.reply("Please provide a valid duration in seconds to mute the user.");
    }

    try {
        const muteReason = `Muted for ${duration} seconds.`;

        await userToMute.timeout(duration * 1000, muteReason);
        message.channel.send(`${userToMute.user.tag} has been muted. Duration: ${duration} seconds.`);

        setTimeout(() => {
            if (userToMute.isCommunicationDisabled()) {
                userToMute.timeout(null, "Mute duration expired.")
                    .catch(err => console.error("Failed to unmute after duration:", err));
            }
        }, duration * 1000);
    } catch (error) {
        console.error(error);
        message.channel.send("An error occurred while muting the user.");
    }
}

async function handleUnmuteCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("You don't have permission to unmute members.");
    }

    const userToUnmute = message.mentions.members.first();

    if (!userToUnmute) {
        return message.reply("Please mention a valid user to unmute.");
    }

    if (!userToUnmute.isCommunicationDisabled()) {
        return message.reply(`${userToUnmute.user.tag} is not currently muted.`);
    }

    try {
        await userToUnmute.timeout(null, "Unmuted by moderator.");
        message.channel.send(`${userToUnmute.user.tag} has been unmuted.`);
    } catch (error) {
        console.error(error);
        message.channel.send("An error occurred while unmuting the user.");
    }
}

async function handleRenewCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to renew channels.");
    }

    const channel = message.channel;

    try {
        const channelName = channel.name;
        const channelType = channel.type;
        const channelPosition = channel.position;
        const channelPermissions = channel.permissionOverwrites.cache.map((overwrite) => ({
            id: overwrite.id,
            allow: overwrite.allow.bitfield,
            deny: overwrite.deny.bitfield,
        }));

        const parent = channel.parent;

        await channel.delete("Channel renewal initiated.");

        const newChannel = await message.guild.channels.create({
            name: channelName,
            type: channelType,
            position: channelPosition,
            parent: parent ? parent.id : null,
            permissionOverwrites: channelPermissions,
        });

        if (channelType === ChannelType.GuildText) {
            await newChannel.setRateLimitPerUser(0);
        }

        await newChannel.send(`The channel **${channelName}** has been successfully renewed.`);
    } catch (error) {
        console.error(error);
        message.guild.systemChannel?.send("An error occurred while renewing this channel.");
    }
}

async function handleWarnCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to warn users.");
    }

    const userToWarn = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || "No reason provided";

    if (!userToWarn) {
        return message.reply("Please mention a valid user to warn.");
    }

    if (userToWarn.id === message.author.id) {
        return message.reply("You cannot warn yourself.");
    }

    if (!warnings.has(userToWarn.id)) {
        warnings.set(userToWarn.id, []);
    }

    const userWarnings = warnings.get(userToWarn.id);
    userWarnings.push({ reason, moderator: message.author.tag, timestamp: new Date() });
    warnings.set(userToWarn.id, userWarnings);

    saveBackup();

    try {
        await userToWarn.send(
            `You have been warned in **${message.guild.name}** for the following reason: **${reason}**`
        );
    } catch {
        message.channel.send("The user has DMs disabled or I can't reach them.");
    }

    message.channel.send(
        `⚠️ **${userToWarn.user.tag}** has been warned for: **${reason}**\nThis user now has **${userWarnings.length} warnings.**`
    );
}

async function handleWarningsCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to view warnings.");
    }

    const userToCheck = message.mentions.members.first();

    if (!userToCheck) {
        return message.reply("Please mention a valid user to check warnings.");
    }

    const userWarnings = warnings.get(userToCheck.id);

    if (!userWarnings || userWarnings.length === 0) {
        return message.channel.send(`**${userToCheck.user.tag}** has no warnings.`);
    }

    const warningMessages = userWarnings.map(
        (warn, index) =>
            `**${index + 1}.** Reason: *${warn.reason}* | Moderator: *${warn.moderator}* | Date: *${warn.timestamp.toLocaleString()}*`
    );

    message.channel.send(`⚠️ Warnings for **${userToCheck.user.tag}**:\n${warningMessages.join("\n")}`);
}

async function handleClearWarningsCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to clear warnings.");
    }

    const userToClear = message.mentions.members.first();

    if (!userToClear) {
        return message.reply("Please mention a valid user to clear warnings.");
    }

    if (warnings.has(userToClear.id)) {
        warnings.delete(userToClear.id);

        saveBackup();

        message.channel.send(`All warnings for **${userToClear.user.tag}** have been cleared.`);
    } else {
        message.channel.send(`**${userToClear.user.tag}** has no warnings to clear.`);
    }
}

async function handleHelpCommand(message) {
    const pages = [
        new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('CyberGuard Bot Commands - Moderation')
            .setDescription(
                `
**Moderation:**
- \`+mute @user [duration]\`: Mute a user for a specified duration (in seconds).
- \`+unmute @user\`: Unmute a previously muted user.
- \`+warn @user [reason]\`: Warn a user with an optional reason.
- \`+warnings @user\`: Check warnings for a user.
- \`+clearwarnings @user\`: Clear all warnings for a user.
- \`+ban @user [reason]\`: Ban a user with an optional reason.
- \`+unban [user ID]\`: Unban a user by their ID.
- \`+kick @user [reason]\`: Kick a user from the server.
- \`+blacklist [word]\`: Add a word to the blacklist (auto-deleted if used).
- \`+whitelist [word]\`: Remove a word from the blacklist.
                `
            ),
        new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('CyberGuard Bot Commands - Server Management')
            .setDescription(
                `
**Server Management:**
- \`+lock\`: Lock the current channel (prevent messages from everyone).
- \`+unlock\`: Unlock the current channel (allow messages again).
- \`+lockall\`: Lock all text channels on the server.
- \`+unlockall\`: Unlock all text channels on the server.
- \`+renew\`: Recreate the current channel (deletes and recreates it with the same settings).
- \`+clear [number]\`: Delete the specified number of recent messages.
- \`+clearall\`: Clear **all messages** in the current channel.
                `
            ),
        new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('CyberGuard Bot Commands - Utility & Fun')
            .setDescription(
                `
**Utility:**
- \`+snipe\`: View the most recently deleted message in the channel.
- \`+help\`: Display this help menu.
- \`+createemoji [emoji(s)]\`: Add emoji(s) from another server to your current server.

**Fun:**
- \`+val\`: Send "réponds mp" with @Valentina's mention every second in all text channels.
- \`+unval\`: Stop the \`+val\` spam.
                `
            ),
        new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('CyberGuard Bot Commands - Raid Protection')
            .setDescription(
                `
**Raid Protection:**
- **Anti-Spam:** Automatically detects and mutes users spamming more than \`RAID_PROTECTION_SETTINGS.maxMessagesPerSecond\`.
- **Mass Join Detection:** Detects and locks the server during mass join attempts.
- **Account Age Restriction:** Kicks users with accounts younger than \`RAID_PROTECTION_SETTINGS.accountAgeLimit\` days.
                `
            )
    ];

    let currentPage = 0;

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('⬅️ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('next')
            .setLabel('➡️ Next')
            .setStyle(ButtonStyle.Primary)
    );

    const messageComponent = await message.channel.send({
        embeds: [pages[currentPage]],
        components: [buttons]
    });

    const collector = message.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 60000
    });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'prev') {
            currentPage = Math.max(currentPage - 1, 0);
        } else if (interaction.customId === 'next') {
            currentPage = Math.min(currentPage + 1, pages.length - 1);
        }

        buttons.components[0].setDisabled(currentPage === 0);
        buttons.components[1].setDisabled(currentPage === pages.length - 1);

        await interaction.update({
            embeds: [pages[currentPage]],
            components: [buttons]
        });
    });

    collector.on('end', () => {
        buttons.components[0].setDisabled(true);
        buttons.components[1].setDisabled(true);
        messageComponent.edit({ components: [buttons] });
    });
}

async function handleCreateEmojiCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        return message.reply("You don't have permission to manage emojis.");
    }

    const emojiRegex = /<a?:(\w+):(\d+)>/g;
    const matches = [...message.content.matchAll(emojiRegex)];

    if (matches.length === 0) {
        return message.reply("Please include valid emojis from other servers in your message.");
    }

    const responses = [];

    for (const match of matches) {
        const emojiName = match[1];
        const emojiId = match[2];

        try {
            const isAnimated = match[0].startsWith("<a:");
            const emojiUrl = isAnimated
                ? `https://cdn.discordapp.com/emojis/${emojiId}.gif`
                : `https://cdn.discordapp.com/emojis/${emojiId}.webp`;

            const emoji = await message.guild.emojis.create({
                attachment: emojiUrl,
                name: emojiName,
            });

            responses.push(
                `✅ Emoji **:${emoji.name}:** added successfully${isAnimated ? " (animated)." : "."}`
            );
        } catch (error) {
            console.error(error);
            responses.push(`❌ Failed to add emoji **${emojiName}**: ${error.message}`);
        }
    }

    if (responses.length > 0) {
        message.channel.send(responses.join("\n"));
    }
}

async function handlePermsCommand(message, args) {
    const botOwnerID = process.env.BOT_OWNER_ID;

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ You don't have permission to use this command.");
    }

    const userToGrant = message.mentions.users.first();
    if (!userToGrant) {
        return message.reply("❌ Please mention a user to grant permissions.");
    }

    botPermissions.add(userToGrant.id);

    saveBackup();

    return message.channel.send(`✅ Successfully granted bot permissions to **${userToGrant.tag}**.`);
}

async function handleBlacklistWordCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("❌ You don't have permission to blacklist words.");
    }

    const word = args.join(' ').toLowerCase();
    if (!word) {
        return message.reply("❌ Please specify a word to blacklist.");
    }

    if (blacklist.has(word)) {
        return message.reply(`❌ The word **${word}** is already blacklisted.`);
    }

    blacklist.add(word);
    saveBackup();
    return message.channel.send(`✅ The word **${word}** has been added to the blacklist.`);
}

async function handleWhitelistWordCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("❌ You don't have permission to whitelist words.");
    }

    const word = args.join(' ').toLowerCase();
    if (!word) {
        return message.reply("❌ Please specify a word to whitelist.");
    }

    if (!blacklist.has(word)) {
        return message.reply(`❌ The word **${word}** is not in the blacklist.`);
    }

    blacklist.delete(word);
    saveBackup();
    return message.channel.send(`✅ The word **${word}** has been removed from the blacklist.`);
}

async function handleUnpermCommand(message, args) {
    const botOwnerID = process.env.BOT_OWNER_ID;

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ You don't have permission to use this command.");
    }

    const userToRemove = message.mentions.users.first();
    if (!userToRemove) {
        return message.reply("❌ Please mention a user to remove permissions.");
    }

    if (!botPermissions.has(userToRemove.id)) {
        return message.reply(`❌ The user **${userToRemove.tag}** does not have bot permissions.`);
    }

    botPermissions.delete(userToRemove.id);

    saveBackup();

    const channels = message.guild.channels.cache;
    channels.forEach(async (channel) => {
        if (channel.type === ChannelType.GuildText) {
            const overwrite = channel.permissionOverwrites.cache.get(userToRemove.id);
            if (overwrite) {
                await channel.permissionOverwrites.delete(userToRemove.id).catch(console.error);
            }
        }
    });

    return message.channel.send(`✅ Successfully removed bot permissions from **${userToRemove.tag}**.`);
}

async function filterBlacklistedWords(message) {
    const words = message.content.toLowerCase().split(/\s+/);
    for (const word of words) {
        if (blacklist.has(word)) {
            await message.delete();
            return message.channel.send(
                `❌ A blacklisted word was detected in your message, ${message.author}. Please follow the server rules.`
            );
        }
    }
}

async function detectAndHandleSpam(message) {
    const now = Date.now();
    const timestamps = raidProtectionState.messageTimestamps.get(message.author.id) || [];
    const filtered = timestamps.filter(timestamp => now - timestamp < 1000);
    filtered.push(now);
    raidProtectionState.messageTimestamps.set(message.author.id, filtered);

    console.log(`User: ${message.author.tag}, Timestamps: ${filtered.length}`); // Debug log

    if (filtered.length > RAID_PROTECTION_SETTINGS.maxMessagesPerSecond) {
        console.log(`Spam detected for user: ${message.author.tag}`); // Debug log
        await message.delete().catch(() => null);
        await muteUser(message.member, RAID_PROTECTION_SETTINGS.muteDuration);
        return message.channel.send(
            `🚨 **${message.author.tag}** has been muted for spamming.`
        );
    }
}

async function detectAndHandleMassJoins(member) {
    const now = Date.now();
    const guildId = member.guild.id;

    const joinTimestamps = raidProtectionState.joinTimestamps.get(guildId) || [];
    const filtered = joinTimestamps.filter(timestamp => now - timestamp < RAID_PROTECTION_SETTINGS.joinDetectionWindow);
    filtered.push(now);

    raidProtectionState.joinTimestamps.set(guildId, filtered);

    console.log(`Guild: ${member.guild.name}, Joins Detected: ${filtered.length}`); // Debug log

    if (filtered.length > RAID_PROTECTION_SETTINGS.maxJoinsPerWindow) {
        console.log("Mass-join detected. Locking the server."); // Debug log
        member.guild.channels.cache.find(channel => channel.type === ChannelType.GuildText)?.send(
            "🚨 **Mass-join detected! Locking the server to prevent raids.**"
        );
        await lockAllChannels(member.guild);
    }
}

async function enforceAccountAgeRestriction(member) {
    const accountAge = (Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24); // Age in days

//    if (accountAge < RAID_PROTECTION_SETTINGS.accountAgeLimit) {
//        await member.send(
//            "🚨 Your account is too new to join this server. Please try again later."
//        ).catch(() => null);
//        await member.kick("Account too new for server restrictions.");
//    }
}

async function muteUser(member, duration) {
    if (!member.moderatable) {
        console.error(`Cannot mute user: ${member.user.tag}. Ensure bot role is higher.`);
        return;
    }
    try {
        console.log(`Muting user: ${member.user.tag} for ${duration / 1000} seconds.`);
        await member.timeout(duration, "Muted by raid protection system.");
    } catch (error) {
        console.error(`Failed to mute user ${member.user.tag}:`, error);
    }
}

async function lockAllChannels(guild) {
    const channels = guild.channels.cache;
    channels.forEach(async channel => {
        if (channel.type === ChannelType.GuildText) {
            console.log(`Locking channel: ${channel.name}`); // Debug log
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        }
    });
}

process.on('exit', saveBackup);
process.on('SIGINT', () => {
    saveBackup();
    process.exit();
});

module.exports = {
    handleCommand,
    filterBlacklistedWords,
    detectAndHandleSpam,
    detectAndHandleMassJoins,
    enforceAccountAgeRestriction,
};