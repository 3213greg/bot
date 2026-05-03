require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Przechowywanie aktywnych ticketow
const activeTickets = new Map();
const mutedUsers = new Map();

// Notatki o graczach
const playerNotes = new Map(); // { userId: [{text, mod, date}] }

// System XP i poziomow
const userXP = new Map(); // { userId: { xp: 0, level: 1, lastMessage: timestamp } }
const xpCooldown = 60000; // 1 minuta cooldown na XP

// System ekonomii
const userMoney = new Map(); // { userId: { coins: 0, lastDaily: timestamp } }

// System ostrzezen
const userWarnings = new Map(); // { userId: [{ reason, moderator, timestamp }] }

// Anti-spam system
const messageTracker = new Map(); // { userId: [timestamps] }
const spamThreshold = 15; // 15 wiadomosci
const spamTimeWindow = 10000; // w ciagu 10 sekund
const spamMuteDuration = 30 * 60 * 1000; // 30 minut

// System okradania
const robCooldowns = new Map(); // { userId: timestamp }
const robCooldownTime = 60 * 60 * 1000; // 1 godzina cooldown
const robSuccessChance = 0.20; // 20% szansa na sukces
const robStealPercent = 0.25; // 25% monet ofiary
const robFailPenalty = 0.15; // 15% kary przy porazce

// System pracy
const workCooldowns = new Map();
const workCooldownTime = 60 * 60 * 1000; // 1 godzina cooldown

// Inventory system
const userInventory = new Map(); // { userId: { items: [] } }

// Achievements
const userAchievements = new Map(); // { userId: [achievement_ids] }

// Lottery
let lotteryPool = 0;
let lotteryTickets = new Map(); // { userId: ticketCount }
let lastLotteryDraw = Date.now();

// Duels
const activeDuels = new Map(); // { userId: { opponent, bet, channelId } }

// Voice tracking
const voiceJoinTimes = new Map(); // { userId: timestamp }
const voiceTotalTime = new Map(); // { userId: totalSeconds }

// Sticky messages
const stickyMessages = new Map(); // { channelId: { content, messageId } }

// AFK tracking
const voiceActivityTracking = new Map(); // { userId: { lastActivity: timestamp, muteStartTime: timestamp, checkInterval: intervalId } }

// Definicje achievementow
const achievements = {
    first_win_bj: { name: 'Pierwsza wygrana w Blackjack', reward: 100, emoji: '🃏' },
    level_10: { name: 'Osiagnij poziom 10', reward: 500, emoji: '⭐' },
    level_20: { name: 'Osiagnij poziom 20', reward: 1000, emoji: '🌟' },
    rich_1000: { name: 'Zbierz 1000 monet', reward: 200, emoji: '💰' },
    rich_5000: { name: 'Zbierz 5000 monet', reward: 500, emoji: '💎' },
    gambler: { name: 'Zagraj 50 razy', reward: 300, emoji: '🎰' },
    worker: { name: 'Pracuj 20 razy', reward: 400, emoji: '💼' },
    thief: { name: 'Okradnij 5 osob', reward: 500, emoji: '🦹' }
};

// Sklep - przedmioty
const shopItems = {
    xp_boost: { name: 'XP Boost (24h)', price: 500, emoji: '⚡', duration: 24 * 60 * 60 * 1000 },
    money_boost: { name: 'Money Boost (24h)', price: 500, emoji: '💸', duration: 24 * 60 * 60 * 1000 },
    lucky_card: { name: 'Karta Szczescia', price: 300, emoji: '🍀', uses: 3 }
};

// Giveaways
const activeGiveaways = new Map();

// Polls
const activePolls = new Map();

// Events
const serverEvents = new Map();

// Blackjack games
const activeBlackjackGames = new Map();

// Sciezki do plikow danych
const DATA_DIR = path.join(__dirname, 'data');
const XP_FILE = path.join(DATA_DIR, 'xp.json');
const MONEY_FILE = path.join(DATA_DIR, 'money.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'warnings.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, 'achievements.json');
const LOTTERY_FILE = path.join(DATA_DIR, 'lottery.json');
const VOICE_FILE = path.join(DATA_DIR, 'voice.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

// Utworz folder data jesli nie istnieje
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Funkcje zapisu i odczytu danych
function saveData() {
    try {
        // Konwertuj Map na Object
        const xpData = Object.fromEntries(userXP);
        const moneyData = Object.fromEntries(userMoney);
        const warningsData = Object.fromEntries(userWarnings);
        const inventoryData = Object.fromEntries(userInventory);
        const achievementsData = Object.fromEntries(userAchievements);
        const lotteryData = {
            pool: lotteryPool,
            tickets: Object.fromEntries(lotteryTickets),
            lastDraw: lastLotteryDraw
        };
        const voiceData = Object.fromEntries(voiceTotalTime);
        
        fs.writeFileSync(XP_FILE, JSON.stringify(xpData, null, 2));
        fs.writeFileSync(MONEY_FILE, JSON.stringify(moneyData, null, 2));
        fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warningsData, null, 2));
        fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventoryData, null, 2));
        fs.writeFileSync(ACHIEVEMENTS_FILE, JSON.stringify(achievementsData, null, 2));
        fs.writeFileSync(LOTTERY_FILE, JSON.stringify(lotteryData, null, 2));
        fs.writeFileSync(VOICE_FILE, JSON.stringify(voiceData, null, 2));
        fs.writeFileSync(NOTES_FILE, JSON.stringify(Object.fromEntries(playerNotes), null, 2));
        
        console.log('✅ Dane zapisane');
    } catch (error) {
        console.error('❌ Blad zapisu danych:', error);
    }
}

function loadData() {
    try {
        // Wczytaj XP
        if (fs.existsSync(XP_FILE)) {
            const xpData = JSON.parse(fs.readFileSync(XP_FILE, 'utf8'));
            for (const [userId, data] of Object.entries(xpData)) {
                userXP.set(userId, data);
            }
            console.log(`✅ Wczytano ${userXP.size} uzytkownikow (XP)`);
        }
        
        // Wczytaj monety
        if (fs.existsSync(MONEY_FILE)) {
            const moneyData = JSON.parse(fs.readFileSync(MONEY_FILE, 'utf8'));
            for (const [userId, data] of Object.entries(moneyData)) {
                userMoney.set(userId, data);
            }
            console.log(`✅ Wczytano ${userMoney.size} uzytkownikow (Monety)`);
        }
        
        // Wczytaj ostrzezenia
        if (fs.existsSync(WARNINGS_FILE)) {
            const warningsData = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
            for (const [userId, data] of Object.entries(warningsData)) {
                userWarnings.set(userId, data);
            }
            console.log(`✅ Wczytano ${userWarnings.size} uzytkownikow (Ostrzezenia)`);
        }
        
        // Wczytaj inventory
        if (fs.existsSync(INVENTORY_FILE)) {
            const inventoryData = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
            for (const [userId, data] of Object.entries(inventoryData)) {
                userInventory.set(userId, data);
            }
            console.log(`✅ Wczytano ${userInventory.size} uzytkownikow (Inventory)`);
        }
        
        // Wczytaj achievements
        if (fs.existsSync(ACHIEVEMENTS_FILE)) {
            const achievementsData = JSON.parse(fs.readFileSync(ACHIEVEMENTS_FILE, 'utf8'));
            for (const [userId, data] of Object.entries(achievementsData)) {
                userAchievements.set(userId, data);
            }
            console.log(`✅ Wczytano ${userAchievements.size} uzytkownikow (Achievements)`);
        }
        
        // Wczytaj lottery
        if (fs.existsSync(LOTTERY_FILE)) {
            const lotteryData = JSON.parse(fs.readFileSync(LOTTERY_FILE, 'utf8'));
            lotteryPool = lotteryData.pool || 0;
            lastLotteryDraw = lotteryData.lastDraw || Date.now();
            if (lotteryData.tickets) {
                for (const [userId, count] of Object.entries(lotteryData.tickets)) {
                    lotteryTickets.set(userId, count);
                }
            }
            console.log(`✅ Wczytano loterie (Pula: ${lotteryPool})`);
        }
        
        // Wczytaj voice stats
        if (fs.existsSync(VOICE_FILE)) {
            const voiceData = JSON.parse(fs.readFileSync(VOICE_FILE, 'utf8'));
            for (const [userId, time] of Object.entries(voiceData)) {
                voiceTotalTime.set(userId, time);
            }
            console.log(`✅ Wczytano ${voiceTotalTime.size} uzytkownikow (Voice)`);
        }

        // Wczytaj notatki
        if (fs.existsSync(NOTES_FILE)) {
            const notesData = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
            for (const [userId, notes] of Object.entries(notesData)) {
                playerNotes.set(userId, notes);
            }
            console.log(`✅ Wczytano notatki (${playerNotes.size} graczy)`);
        }
    } catch (error) {
        console.error('❌ Blad wczytywania danych:', error);
    }
}

// Auto-zapis co 30 sekund
setInterval(() => {
    saveData();
}, 30 * 1000);

// Funkcja losowania loterii
async function drawLottery() {
    if (lotteryTickets.size === 0) {
        console.log('Brak uczestnikow loterii');
        return;
    }
    
    // Losuj zwyciezce
    const participants = Array.from(lotteryTickets.entries());
    const totalTickets = participants.reduce((sum, [_, count]) => sum + count, 0);
    
    let rand = Math.floor(Math.random() * totalTickets);
    let winner = null;
    
    for (const [userId, count] of participants) {
        rand -= count;
        if (rand < 0) {
            winner = userId;
            break;
        }
    }
    
    if (winner) {
        const userData = userMoney.get(winner) || { coins: 0, lastDaily: 0 };
        userData.coins += lotteryPool;
        userMoney.set(winner, userData);
        
        console.log(`🎫 Loteria: ${winner} wygral ${lotteryPool} monet!`);
        
        // Wyslij wiadomosc na kanal
        try {
            const user = await client.users.fetch(winner);
            client.guilds.cache.forEach(guild => {
                const channel = guild.channels.cache.find(c => c.name.includes('ogłoszenia') || c.name.includes('ogloszenia'));
                if (channel) {
                    const lotteryEmbed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🎫 LOSOWANIE LOTERII!')
                        .setDescription(`**${user.username}** wygral loterie!\n\nWygrana: **${lotteryPool}** monet!`)
                        .setTimestamp();
                    
                    channel.send({ embeds: [lotteryEmbed] });
                }
            });
        } catch (error) {
            console.error('Blad wysylania wiadomosci loterii:', error);
        }
    }
    
    // Reset loterii
    lotteryPool = 0;
    lotteryTickets.clear();
    lastLotteryDraw = Date.now();
    saveData();
}

// Funkcja sprawdzania achievementow
function checkAchievement(userId, achievementId) {
    const userAchs = userAchievements.get(userId) || [];
    
    if (userAchs.includes(achievementId)) {
        return false; // Juz ma
    }
    
    const achievement = achievements[achievementId];
    if (!achievement) return false;
    
    userAchs.push(achievementId);
    userAchievements.set(userId, userAchs);
    
    // Nagroda
    const userData = userMoney.get(userId) || { coins: 0, lastDaily: 0 };
    userData.coins += achievement.reward;
    userMoney.set(userId, userData);
    
    return true;
}

// Funkcje blackjack
function createDeck() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];
    
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    
    return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card) {
    if (card.value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    return parseInt(card.value);
}

function calculateHand(hand) {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
        value += getCardValue(card);
        if (card.value === 'A') aces++;
    }
    
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    
    return value;
}

function formatHand(hand, hideFirst = false) {
    if (hideFirst) {
        return `🂠 ${hand[1].value}${hand[1].suit}`;
    }
    return hand.map(card => `${card.value}${card.suit}`).join(' ');
}

// Funkcje pomocnicze XP
function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp)) + 1;
}

function getXPForLevel(level) {
    return Math.pow((level - 1) / 0.1, 2);
}

// Funkcja anty-spam
function checkSpam(userId) {
    const now = Date.now();
    const userMessages = messageTracker.get(userId) || [];
    
    // Usun stare wiadomosci sprzed timeWindow
    const recentMessages = userMessages.filter(timestamp => now - timestamp < spamTimeWindow);
    
    // Dodaj nowa wiadomosc
    recentMessages.push(now);
    messageTracker.set(userId, recentMessages);
    
    // Sprawdz czy przekroczono limit
    return recentMessages.length >= spamThreshold;
}

// Funkcja aktualizacji kanalow statystyk
async function updateStatsChannels(guild) {
    try {
        // Pobierz wszystkich memberow z API (nie tylko z cache)
        await guild.members.fetch();
        
        const allMembers = guild.memberCount;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const totalMembers = allMembers - bots;
        const onlineMembers = guild.members.cache.filter(m => !m.user.bot && m.presence?.status && m.presence.status !== 'offline').size;

        // Znajdz kanaly statystyk (po nazwie)
        const channels = guild.channels.cache;
        
        // Kanal z liczba czlonkow (po ID)
        const membersChannel = guild.channels.cache.get('1498105607369265263') || channels.find(c => c.name.includes('Czlonkow:') || c.name.includes('STAN:'));
        if (membersChannel && membersChannel.type === ChannelType.GuildVoice) {
            await membersChannel.setName(`👥 Czlonkow: ${totalMembers}`).catch(() => {});
        }

        // Kanal z liczba online
        const onlineChannel = channels.find(c => c.name.includes('Online:'));
        if (onlineChannel && onlineChannel.type === ChannelType.GuildVoice) {
            await onlineChannel.setName(`🟢 Online: ${onlineMembers}`).catch(() => {});
        }

        // Kanal z liczba botow
        const botsChannel = channels.find(c => c.name.includes('Botow:'));
        if (botsChannel && botsChannel.type === ChannelType.GuildVoice) {
            await botsChannel.setName(`🤖 Botow: ${bots}`).catch(() => {});
        }
    } catch (error) {
        console.error('Blad aktualizacji statystyk:', error);
    }
}

// Event: Bot gotowy
client.once('ready', () => {
    console.log(`✅ Bot zalogowany jako ${client.user.tag}`);
    console.log(`📊 Serwery: ${client.guilds.cache.size}`);
    console.log(`👥 Uzytkownicy: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
    
    // Wczytaj dane z plikow
    loadData();
    
    // Ustaw status bota
    client.user.setActivity('🎮 Minecraft Clan', { type: 'WATCHING' });

    // Aktualizuj statystyki co 1 minute
    client.guilds.cache.forEach(guild => {
        updateStatsChannels(guild);
        setInterval(() => updateStatsChannels(guild), 1 * 60 * 1000);
    });
    
    // Losowanie loterii co 24h
    setInterval(() => {
        drawLottery();
    }, 24 * 60 * 60 * 1000);
});

// Event: Nowy czlonek dolacza
client.on('guildMemberAdd', async (member) => {
    // Wiadomosc na kanale powitalnym
    const welcomeChannel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (welcomeChannel) {
        const verificationChannelId = process.env.VERIFICATION_CHANNEL_ID;
        const regulaminChannelId = '1498110530915795154';
        
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👋 Witamy na serwerze!')
            .setDescription(`Witaj ${member}! Jestes **${member.guild.memberCount}** czlonkiem naszego klanu!`)
            .addFields(
                { name: '📜 Regulamin', value: `Przeczytaj regulamin w <#${regulaminChannelId}>`, inline: true },
                { name: '✅ Weryfikacja', value: `Zweryfikuj sie w <#${verificationChannelId}>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });
        
        welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
    
    // Log do kanalu administracyjnego
    const logsChannel = member.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
    if (logsChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📥 Nowy czlonek')
            .setDescription(`${member.user.tag} (${member.id})`)
            .addFields(
                { name: 'Konto utworzone', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Dolaczyl', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        logsChannel.send({ embeds: [logEmbed] });
    }

    // Aktualizuj statystyki
    updateStatsChannels(member.guild);
});

// Event: Czlonek opuszcza serwer
client.on('guildMemberRemove', async (member) => {
    const logsChannel = member.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
    if (logsChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('📤 Czlonek opuscil serwer')
            .setDescription(`${member.user.tag} (${member.id})`)
            .addFields(
                { name: 'Dolaczyl', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Opuscil', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        logsChannel.send({ embeds: [logEmbed] });
    }

    // Aktualizuj statystyki
    updateStatsChannels(member.guild);
});

// Event: Voice State Update (tracking czasu na voice)
client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;
    const afkChannelId = process.env.AFK_CHANNEL_ID;
    
    // Dolaczyl na kanal
    if (!oldState.channelId && newState.channelId) {
        voiceJoinTimes.set(userId, Date.now());
        
        // Nie trackuj AFK jesli juz jest na kanale AFK
        if (newState.channelId !== afkChannelId) {
            startAFKTracking(newState.member);
        }
    }
    
    // Wyszedl z kanalu
    if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceJoinTimes.get(userId);
        if (joinTime) {
            const timeSpent = Math.floor((Date.now() - joinTime) / 1000); // sekundy
            const totalTime = voiceTotalTime.get(userId) || 0;
            voiceTotalTime.set(userId, totalTime + timeSpent);
            voiceJoinTimes.delete(userId);
            
            // Nagroda za czas na voice (1 moneta za minute)
            const coinsEarned = Math.floor(timeSpent / 60);
            if (coinsEarned > 0) {
                const userData = userMoney.get(userId) || { coins: 0, lastDaily: 0 };
                userData.coins += coinsEarned;
                userMoney.set(userId, userData);
            }
        }
        
        // Zatrzymaj tracking AFK
        stopAFKTracking(userId);
    }
    
    // Przelaczyl kanal
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const joinTime = voiceJoinTimes.get(userId);
        if (joinTime) {
            const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
            const totalTime = voiceTotalTime.get(userId) || 0;
            voiceTotalTime.set(userId, totalTime + timeSpent);
            voiceJoinTimes.set(userId, Date.now()); // Nowy czas startu
            
            const coinsEarned = Math.floor(timeSpent / 60);
            if (coinsEarned > 0) {
                const userData = userMoney.get(userId) || { coins: 0, lastDaily: 0 };
                userData.coins += coinsEarned;
                userMoney.set(userId, userData);
            }
        }
        
        // Restart tracking AFK jesli nie jest na kanale AFK
        stopAFKTracking(userId);
        if (newState.channelId !== afkChannelId) {
            startAFKTracking(newState.member);
        }
    }
    
    // Zmiana stanu mute/unmute/deaf
    if (oldState.channelId === newState.channelId && newState.channelId) {
        const tracking = voiceActivityTracking.get(userId);
        
        // Wlaczyl mute
        if (!oldState.selfMute && newState.selfMute) {
            if (tracking) {
                tracking.muteStartTime = Date.now();
            }
        }
        
        // Wylaczyl mute
        if (oldState.selfMute && !newState.selfMute) {
            if (tracking) {
                tracking.muteStartTime = null;
                tracking.lastActivity = Date.now(); // Reset aktywnosci
            }
        }
        
        // Zaczal mowic (unmute) - reset aktywnosci
        if (!newState.selfMute && !newState.selfDeaf) {
            if (tracking) {
                tracking.lastActivity = Date.now();
            }
        }
    }
});

// Funkcje AFK tracking
function startAFKTracking(member) {
    const userId = member.id;
    const afkChannelId = process.env.AFK_CHANNEL_ID;
    
    if (!afkChannelId) return;
    
    // Zatrzymaj stary tracking jesli istnieje
    stopAFKTracking(userId);
    
    const tracking = {
        lastActivity: Date.now(),
        muteStartTime: member.voice.selfMute ? Date.now() : null,
        checkInterval: null
    };
    
    // Sprawdzaj co 30 sekund
    tracking.checkInterval = setInterval(async () => {
        const now = Date.now();
        const member = await client.guilds.cache.first().members.fetch(userId).catch(() => null);
        
        if (!member || !member.voice.channelId || member.voice.channelId === afkChannelId) {
            stopAFKTracking(userId);
            return;
        }
        
        const track = voiceActivityTracking.get(userId);
        if (!track) return;
        
        // Sprawdz czy na mute przez 10 minut
        if (track.muteStartTime) {
            const muteTime = now - track.muteStartTime;
            if (muteTime >= 10 * 60 * 1000) { // 10 minut
                await moveToAFK(member, 'Na mute przez 10 minut');
                return;
            }
        }
        
        // Sprawdz czy brak aktywnosci przez 5 minut (tylko jesli nie jest na mute)
        if (!member.voice.selfMute) {
            const inactiveTime = now - track.lastActivity;
            if (inactiveTime >= 5 * 60 * 1000) { // 5 minut
                await moveToAFK(member, 'Brak aktywnosci przez 5 minut');
                return;
            }
        }
    }, 30000); // Co 30 sekund
    
    voiceActivityTracking.set(userId, tracking);
}

function stopAFKTracking(userId) {
    const tracking = voiceActivityTracking.get(userId);
    if (tracking && tracking.checkInterval) {
        clearInterval(tracking.checkInterval);
    }
    voiceActivityTracking.delete(userId);
}

async function moveToAFK(member, reason) {
    const afkChannelId = process.env.AFK_CHANNEL_ID;
    if (!afkChannelId) return;
    
    try {
        await member.voice.setChannel(afkChannelId);
        console.log(`Przeniesiono ${member.user.tag} na AFK: ${reason}`);
        
        // Wyslij DM
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('💤 Przeniesiono na AFK')
                .setDescription(`Zostales przeniesiony na kanal AFK\nPowod: ${reason}`)
                .setTimestamp();
            
            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            // Uzytkownik ma wylaczone DM
        }
        
        stopAFKTracking(member.id);
    } catch (error) {
        console.error('Blad przenoszenia na AFK:', error);
    }
}

// Event: Wiadomosci (komendy)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Reakcja na pingowanie bota
    if (message.mentions.has(client.user)) {
        const responses = [
            'na chuj ten ping pedale jebany',
            'co chcesz ode mnie?',
            'przestań mnie pingować',
            'zajęty jestem',
            'nie mam czasu na ciebie'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        message.reply(randomResponse);
        return;
    }
    
    // Sticky message - przesun na dol
    const sticky = stickyMessages.get(message.channel.id);
    if (sticky && !message.content.startsWith('!')) {
        try {
            const stickyMsg = await message.channel.messages.fetch(sticky.messageId);
            await stickyMsg.delete();
            
            const stickyEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setDescription(`📌 ${sticky.content}`)
                .setFooter({ text: 'Sticky Message' })
                .setTimestamp();
            
            const newStickyMsg = await message.channel.send({ embeds: [stickyEmbed] });
            stickyMessages.set(message.channel.id, {
                content: sticky.content,
                messageId: newStickyMsg.id
            });
        } catch (error) {
            // Sticky message nie istnieje, usun z mapy
            stickyMessages.delete(message.channel.id);
        }
    }
    
    // ANTY-SPAM SYSTEM
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        if (checkSpam(message.author.id)) {
            try {
                await message.member.timeout(spamMuteDuration, 'Auto-mute: Spam (15+ wiadomosci w 10s)');
                
                const spamEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚫 Auto-Mute za Spam')
                    .setDescription(`${message.author} zostal wyciszony na 30 minut za spam!`)
                    .addFields({ name: 'Powod', value: '15+ wiadomosci w ciagu 10 sekund', inline: false })
                    .setTimestamp();
                
                message.channel.send({ embeds: [spamEmbed] });
                
                // Log
                const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
                if (logsChannel) {
                    logsChannel.send({ embeds: [spamEmbed] });
                }
                
                // Wyczysc wiadomosci spamera
                messageTracker.delete(message.author.id);
            } catch (error) {
                console.error('Blad auto-mute:', error);
            }
        }
    }
    
    // SYSTEM XP (tylko dla normalnych wiadomosci, nie komend)
    if (!message.content.startsWith('!')) {
        const userId = message.author.id;
        const userData = userXP.get(userId) || { xp: 0, level: 1, lastMessage: 0 };
        const now = Date.now();
        
        // Cooldown 1 minuta
        if (now - userData.lastMessage >= xpCooldown) {
            const xpGain = Math.floor(Math.random() * 15) + 10; // 10-25 XP
            userData.xp += xpGain;
            userData.lastMessage = now;
            
            const oldLevel = userData.level;
            const newLevel = calculateLevel(userData.xp);
            
            if (newLevel > oldLevel) {
                userData.level = newLevel;
                
                const levelUpEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🚀 LEVEL UP!')
                    .setDescription(`**${message.author}** awansował na poziom **${newLevel}**!`)
                    .addFields(
                        { name: '🎉 Gratulacje!', value: `Zdobyłeś poziom ${newLevel}!`, inline: false },
                        { name: '⭐ Całkowite XP', value: `${userData.xp}`, inline: true },
                        { name: '📊 Poziom', value: `${newLevel}`, inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();
                
                message.channel.send({ content: `${message.author}`, embeds: [levelUpEmbed] });
            }
            
            userXP.set(userId, userData);
        }
        
        return; // Nie przetwarzaj dalej jesli to nie komenda
    }
    
    // KOMENDY
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Komenda: !setup-verification (tworzy panel weryfikacji)
    if (command === 'setup-verification') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do tej komendy!');
        }

        const verificationEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ WERYFIKACJA')
            .setDescription('Kliknij przycisk ponizej, aby zweryfikowac sie i uzyskac dostep do serwera!')
            .addFields(
                { name: '📜 Zasady', value: '• Przeczytaj regulamin\n• Badz kulturalny\n• Szanuj innych czlonkow', inline: false }
            )
            .setFooter({ text: 'Kliknij przycisk aby sie zweryfikowac' })
            .setTimestamp();

        const verifyButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify')
                    .setLabel('✅ Zweryfikuj sie')
                    .setStyle(ButtonStyle.Success)
            );

        await message.channel.send({ embeds: [verificationEmbed], components: [verifyButton] });
        message.delete().catch(() => {});
    }

    // Komenda: !setup-tickets (tworzy panel ticketow)
    if (command === 'setup-tickets') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do tej komendy!');
        }

        const ticketEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🎫 SYSTEM TICKETÓW')
            .setDescription('Wybierz kategorię z listy poniżej, aby otworzyć ticket!')
            .addFields(
                { name: '⚔️ Rekrutacja do klanu', value: 'Chcesz dołączyć do klanu JAPAN?', inline: false },
                { name: '🚪 Opuszczenie klanu', value: 'Chcesz opuścić klan?', inline: false },
                { name: '💬 Inne', value: 'Masz inne pytanie lub problem?', inline: false },
                { name: '⚖️ Sprawa do zarządu', value: 'Masz sprawę do zarządu klanu?', inline: false },
                { name: '⏱️ Czas odpowiedzi', value: 'Odpowiemy w ciągu 3 godzin', inline: false }
            )
            .setFooter({ text: 'Wybierz kategorię z listy poniżej' })
            .setTimestamp();

        const ticketMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('Wybierz kategorię ticketu')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Rekrutacja do klanu')
                            .setDescription('Wybierz tą opcję, aby utworzyć ticket: Rekrutacja do klanu')
                            .setEmoji('⚔️')
                            .setValue('rekrutacja'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Opuszczenie klanu')
                            .setDescription('Wybierz tą opcję, aby utworzyć ticket: Opuszczenie klanu')
                            .setEmoji('🚪')
                            .setValue('opuszczenie'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Inne')
                            .setDescription('Wybierz tą opcję, aby utworzyć ticket: Inne')
                            .setEmoji('💬')
                            .setValue('inne'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Sprawa do zarządu')
                            .setDescription('Wybierz tą opcję, aby utworzyć ticket: Sprawa do zarządu')
                            .setEmoji('⚖️')
                            .setValue('zarzad')
                    )
            );

        await message.channel.send({ embeds: [ticketEmbed], components: [ticketMenu] });
        message.delete().catch(() => {});
    }

    // Komenda: !members (liczba czlonkow)
    if (command === 'members' || command === 'czlonkowie') {
        const totalMembers = message.guild.memberCount;
        const onlineMembers = message.guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
        const bots = message.guild.members.cache.filter(m => m.user.bot).size;
        const humans = totalMembers - bots;

        const statsEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Statystyki Serwera')
            .setDescription(`**${message.guild.name}**`)
            .addFields(
                { name: '👥 Wszyscy czlonkowie', value: `${totalMembers}`, inline: true },
                { name: '🟢 Online', value: `${onlineMembers}`, inline: true },
                { name: '👤 Ludzie', value: `${humans}`, inline: true },
                { name: '🤖 Boty', value: `${bots}`, inline: true },
                { name: '📅 Serwer utworzony', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setThumbnail(message.guild.iconURL())
            .setTimestamp();

        message.reply({ embeds: [statsEmbed] });
    }

    // Komenda: !regulamin (wyswietla regulamin)
    if (command === 'regulamin') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Nie masz uprawnien do tej komendy!');
        }

        const regulaminEmbed1 = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('REGULAMIN SERWERA')
            .addFields(
                { name: 'ZASADY OGOLNE', value: '1. Szanuj innych uzytkownikow - zakaz wyzywania, obrazania i prowokowania\n2. Zakaz spamu, floodowania i naduzywania CAPS LOCKA\n3. Zakaz reklamy innych serwerow bez zgody administracji\n4. Uzywaj kanalow zgodnie z ich przeznaczeniem\n5. Zakaz tresci +18, przemocy, gore\n6. Zakaz tresci rasistowskich i dyskryminujacych\n7. Zakaz nadmiernego pingowania\n8. Przestrzegaj TOS Discorda', inline: false }
            )
            .setTimestamp();

        const regulaminEmbed2 = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('KARY')
            .setDescription('OSTRZEZENIE - lekkie naruszenia regulaminu\nMUTE - spam, flood, niekulturalne zachowanie\nKICK - powtarzajace sie naruszenia\nBAN - powazne naruszenia, zdrada, tresci +18, rasizm')
            .setFooter({ text: 'Administracja zastrzega sobie prawo do zmiany regulaminu' })
            .setTimestamp();

        await message.channel.send({ embeds: [regulaminEmbed1, regulaminEmbed2] });
        message.delete().catch(() => {});
    }

    // Komenda: !mute
    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Nie masz uprawnien do wyciszania czlonkow!');
        }

        const member = message.mentions.members.first();
        const duration = args[1] || '10m';
        const reason = args.slice(2).join(' ') || 'Brak powodu';

        if (!member) {
            return message.reply('❌ Oznacz uzytkownika do wyciszenia! Uzycie: `!mute @uzytkownik 10m powod`');
        }

        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie mozesz wyciszyc administratora!');
        }

        // Konwersja czasu
        const timeMatch = duration.match(/^(\d+)([smhd])$/);
        if (!timeMatch) {
            return message.reply('❌ Nieprawidlowy format czasu! Uzyj: 10s, 5m, 2h, 1d');
        }

        const timeValue = parseInt(timeMatch[1]);
        const timeUnit = timeMatch[2];
        let milliseconds;

        switch (timeUnit) {
            case 's': milliseconds = timeValue * 1000; break;
            case 'm': milliseconds = timeValue * 60 * 1000; break;
            case 'h': milliseconds = timeValue * 60 * 60 * 1000; break;
            case 'd': milliseconds = timeValue * 24 * 60 * 60 * 1000; break;
        }

        try {
            await member.timeout(milliseconds, reason);

            const muteEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔇 Uzytkownik wyciszony')
                .addFields(
                    { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                    { name: 'Moderator', value: `${message.author.tag}`, inline: true },
                    { name: 'Czas', value: duration, inline: true },
                    { name: 'Powod', value: reason, inline: false }
                )
                .setTimestamp();

            message.reply({ embeds: [muteEmbed] });

            // Log
            const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                logsChannel.send({ embeds: [muteEmbed] });
            }
        } catch (error) {
            message.reply('❌ Nie udalo sie wyciszyc uzytkownika!');
            console.error(error);
        }
    }

    // Komenda: !unmute
    if (command === 'unmute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Nie masz uprawnien do odciszania czlonkow!');
        }

        const member = message.mentions.members.first();
        if (!member) {
            return message.reply('❌ Oznacz uzytkownika do odciszenia! Uzycie: `!unmute @uzytkownik`');
        }

        try {
            await member.timeout(null);
            message.reply(`✅ ${member.user.tag} zostal odciszony!`);
        } catch (error) {
            message.reply('❌ Nie udalo sie odciszyc uzytkownika!');
        }
    }

    // Komenda: !kick
    if (command === 'kick' || command === 'wyrzuc') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ Nie masz uprawnien do wyrzucania czlonkow!');
        }

        const member = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'Brak powodu';

        if (!member) {
            return message.reply('❌ Oznacz uzytkownika do wyrzucenia! Uzycie: `!kick @uzytkownik powod`');
        }

        if (!member.kickable) {
            return message.reply('❌ Nie moge wyrzucic tego uzytkownika!');
        }

        try {
            await member.kick(reason);

            const kickEmbed = new EmbedBuilder()
                .setColor('#FF8800')
                .setTitle('👢 Uzytkownik wyrzucony')
                .addFields(
                    { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                    { name: 'Moderator', value: `${message.author.tag}`, inline: true },
                    { name: 'Powod', value: reason, inline: false }
                )
                .setTimestamp();

            message.reply({ embeds: [kickEmbed] });

            // Log
            const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                logsChannel.send({ embeds: [kickEmbed] });
            }
        } catch (error) {
            message.reply('❌ Nie udalo sie wyrzucic uzytkownika!');
            console.error(error);
        }
    }

    // Komenda: !ban
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ Nie masz uprawnien do banowania czlonkow!');
        }

        const member = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'Brak powodu';

        if (!member) {
            return message.reply('❌ Oznacz uzytkownika do zbanowania! Uzycie: `!ban @uzytkownik powod`');
        }

        if (!member.bannable) {
            return message.reply('❌ Nie moge zbanowac tego uzytkownika!');
        }

        try {
            await member.ban({ reason });

            const banEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔨 Uzytkownik zbanowany')
                .addFields(
                    { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                    { name: 'Moderator', value: `${message.author.tag}`, inline: true },
                    { name: 'Powod', value: reason, inline: false }
                )
                .setTimestamp();

            message.reply({ embeds: [banEmbed] });

            // Log
            const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                logsChannel.send({ embeds: [banEmbed] });
            }
        } catch (error) {
            message.reply('❌ Nie udalo sie zbanowac uzytkownika!');
            console.error(error);
        }
    }

    // Komenda: !xp add (dodaj XP uzytkownikowi)
    if (command === 'xp' && args[0] === 'add') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do dodawania XP!');
        }

        const member = message.mentions.members.first();
        const xpAmount = parseInt(args[2]);

        if (!member) {
            return message.reply('❌ Oznacz uzytkownika! Uzycie: `!xp add @uzytkownik <ilosc>`');
        }

        if (!xpAmount || xpAmount < 1) {
            return message.reply('❌ Podaj prawidlowa ilosc XP! Uzycie: `!xp add @uzytkownik <ilosc>`');
        }

        const userId = member.id;
        const userData = userXP.get(userId) || { xp: 0, level: 1, lastMessage: 0 };
        const oldLevel = userData.level;
        
        userData.xp += xpAmount;
        const newLevel = calculateLevel(userData.xp);
        userData.level = newLevel;
        
        userXP.set(userId, userData);

        const xpEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Dodano XP')
            .addFields(
                { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                { name: 'Dodano XP', value: `+${xpAmount}`, inline: true },
                { name: 'Calkowite XP', value: `${userData.xp}`, inline: true },
                { name: 'Poziom', value: `${userData.level}`, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [xpEmbed] });

        // Sprawdz czy awansowal
        if (newLevel > oldLevel) {
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🚀 LEVEL UP!')
                .setDescription(`**${member}** awansował na poziom **${newLevel}**!`)
                .addFields(
                    { name: '🎉 Gratulacje!', value: `Zdobyłeś poziom ${newLevel}!`, inline: false },
                    { name: '⭐ Całkowite XP', value: `${userData.xp}`, inline: true },
                    { name: '📊 Poziom', value: `${newLevel}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            
            message.channel.send({ content: `${member}`, embeds: [levelUpEmbed] });
        }

        // Log
        const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
        if (logsChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📊 Dodano XP')
                .addFields(
                    { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                    { name: 'Admin', value: `${message.author.tag}`, inline: true },
                    { name: 'Dodano XP', value: `+${xpAmount}`, inline: true }
                )
                .setTimestamp();
            
            logsChannel.send({ embeds: [logEmbed] });
        }
    }

    // Komenda: !xp set (ustaw XP uzytkownikowi)
    if (command === 'xp' && args[0] === 'set') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do ustawiania XP!');
        }

        const member = message.mentions.members.first();
        const xpAmount = parseInt(args[2]);

        if (!member) {
            return message.reply('❌ Oznacz uzytkownika! Uzycie: `!xp set @uzytkownik <ilosc>`');
        }

        if (!xpAmount || xpAmount < 0) {
            return message.reply('❌ Podaj prawidlowa ilosc XP! Uzycie: `!xp set @uzytkownik <ilosc>`');
        }

        const userId = member.id;
        const userData = userXP.get(userId) || { xp: 0, level: 1, lastMessage: 0 };
        const oldLevel = userData.level;
        const oldXP = userData.xp;
        
        userData.xp = xpAmount;
        const newLevel = calculateLevel(userData.xp);
        userData.level = newLevel;
        
        userXP.set(userId, userData);

        const xpEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚙️ Ustawiono XP')
            .addFields(
                { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                { name: 'Poprzednie XP', value: `${oldXP}`, inline: true },
                { name: 'Nowe XP', value: `${userData.xp}`, inline: true },
                { name: 'Poziom', value: `${userData.level}`, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [xpEmbed] });

        // Sprawdz czy awansowal
        if (newLevel > oldLevel) {
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🚀 LEVEL UP!')
                .setDescription(`**${member}** awansował na poziom **${newLevel}**!`)
                .addFields(
                    { name: '🎉 Gratulacje!', value: `Zdobyłeś poziom ${newLevel}!`, inline: false },
                    { name: '⭐ Całkowite XP', value: `${userData.xp}`, inline: true },
                    { name: '📊 Poziom', value: `${newLevel}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            
            message.channel.send({ content: `${member}`, embeds: [levelUpEmbed] });
        }

        // Log
        const logsChannel2 = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
        if (logsChannel2) {
            const logEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚙️ Ustawiono XP')
                .addFields(
                    { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                    { name: 'Admin', value: `${message.author.tag}`, inline: true },
                    { name: 'Poprzednie XP', value: `${oldXP}`, inline: true },
                    { name: 'Nowe XP', value: `${xpAmount}`, inline: true }
                )
                .setTimestamp();
            
            logsChannel2.send({ embeds: [logEmbed] });
        }
    }

    // Komenda: !clear (usun wiadomosci)
    if (command === 'clear' || command === 'purge' || command === 'usun') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Nie masz uprawnien do usuwania wiadomosci!');
        }

        const amount = parseInt(args[0]);

        if (!amount) {
            return message.reply('❌ Uzycie: `!clear <ilosc>`\nPrzyklad: `!clear 10` (usuwa 10 wiadomosci)\n`!clear 100` (usuwa 100 wiadomosci)\nMaksymalnie: 100 wiadomosci na raz');
        }

        if (amount < 1 || amount > 100) {
            return message.reply('❌ Podaj liczbe od 1 do 100!');
        }

        try {
            // Usun wiadomosci
            const deleted = await message.channel.bulkDelete(amount + 1, true); // +1 zeby usunac tez komende
            
            const clearEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🗑️ Wiadomosci usuniete')
                .setDescription(`Usunieto **${deleted.size - 1}** wiadomosci`)
                .setFooter({ text: `Moderator: ${message.author.username}` })
                .setTimestamp();

            const confirmMsg = await message.channel.send({ embeds: [clearEmbed] });

            // Usun potwierdzenie po 5 sekundach
            setTimeout(() => {
                confirmMsg.delete().catch(() => {});
            }, 5000);

            // Log
            const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel && logsChannel.id !== message.channel.id) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🗑️ Wiadomosci usuniete')
                    .addFields(
                        { name: 'Kanal', value: `${message.channel}`, inline: true },
                        { name: 'Ilosc', value: `${deleted.size - 1}`, inline: true },
                        { name: 'Moderator', value: `${message.author.tag}`, inline: true }
                    )
                    .setTimestamp();
                
                logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Blad usuwania wiadomosci:', error);
            message.reply('❌ Nie udalo sie usunac wiadomosci! (Wiadomosci starsze niz 14 dni nie moga byc usuniete)');
        }
    }

    // Komenda: !help
    if (command === 'help' || command === 'pomoc') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📚 Lista Komend')
            .setDescription('Wszystkie dostepne komendy bota')
            .addFields(
                { name: '👥 Ogolne', value: '`!members` - Statystyki serwera\n`!serverinfo` - Info o serwerze\n`!userinfo @user` - Info o uzytkowniku\n`!roleinfo @rola` - Info o roli\n`!voicestats` - Statystyki voice\n`!help` - Ta wiadomosc', inline: false },
                { name: '🔨 Moderacja', value: '`!mute @user 10m powod` - Wycisz uzytkownika\n`!unmute @user` - Odcisz uzytkownika\n`!kick @user powod` - Wyrzuc uzytkownika\n`!ban @user powod` - Zbanuj uzytkownika\n`!warn @user powod` - Daj ostrzezenie\n`!warnings @user` - Zobacz ostrzezenia\n`!clear <ilosc>` - Usun wiadomosci (1-100)\n`!slowmode <czas>` - Ustaw slowmode', inline: false },
                { name: '🎉 Fun', value: '`!8ball pytanie` - Magiczna kula\n`!coinflip` - Rzut moneta\n`!roll 1-100` - Losowa liczba\n`!avatar @user` - Pokaz avatar', inline: false },
                { name: '🎁 Giveaway', value: '`!giveaway 10m Nagroda` - Utworz giveaway\n`!poll "Pytanie?" "Opcja1" "Opcja2"` - Ankieta', inline: false },
                { name: '⚙️ Administracja', value: '`!setup-verification` - Utworz panel weryfikacji\n`!setup-tickets` - Utworz panel ticketow\n`!regulamin` - Wyswietl regulamin\n`!embed` - Utworz embed (tylko admini)\n`!sticky <tekst>` - Przypnij wiadomosc na dole\n`!addmoney @user <ilosc>` - Dodaj monety\n`!save` - Zapisz dane', inline: false }
            )
            .setFooter({ text: 'Uzyj !zabawa aby zobaczyc komendy gier i zabawy!' })
            .setTimestamp();

        message.reply({ embeds: [helpEmbed] });
    }

    // Komenda: !rank (poziom gracza)
    if (command === 'rank' || command === 'poziom') {
        const targetUser = message.mentions.users.first() || message.author;
        const userData = userXP.get(targetUser.id) || { xp: 0, level: 1 };
        const nextLevelXP = getXPForLevel(userData.level + 1);
        const progress = ((userData.xp / nextLevelXP) * 100).toFixed(1);

        const rankEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`📊 Poziom ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '⭐ Poziom', value: `${userData.level}`, inline: true },
                { name: '✨ XP', value: `${userData.xp} / ${Math.floor(nextLevelXP)}`, inline: true },
                { name: '📈 Postep', value: `${progress}%`, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [rankEmbed] });
    }

    // Komenda: !leaderboard (top 10)
    if (command === 'leaderboard' || command === 'top') {
        const sortedUsers = Array.from(userXP.entries())
            .sort((a, b) => b[1].xp - a[1].xp)
            .slice(0, 10);

        let leaderboardText = '';
        for (let i = 0; i < sortedUsers.length; i++) {
            const [userId, data] = sortedUsers[i];
            const user = await client.users.fetch(userId).catch(() => null);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            leaderboardText += `${medal} **${user ? user.username : 'Nieznany'}** - Poziom ${data.level} (${data.xp} XP)\n`;
        }

        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 TOP 10 GRACZY')
            .setDescription(leaderboardText || 'Brak danych')
            .setTimestamp();

        message.reply({ embeds: [leaderboardEmbed] });
    }

    // Komenda: !balance (monety)
    if (command === 'balance' || command === 'bal' || command === 'monety') {
        const targetUser = message.mentions.users.first() || message.author;
        const userData = userMoney.get(targetUser.id) || { coins: 0, lastDaily: 0 };

        const balanceEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`💰 Portfel ${targetUser.username}`)
            .setDescription(`**${userData.coins}** monet`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        message.reply({ embeds: [balanceEmbed] });
    }

    // Komenda: !daily (codzienne monety)
    if (command === 'daily' || command === 'dzienny') {
        const userId = message.author.id;
        const userData = userMoney.get(userId) || { coins: 0, lastDaily: 0 };
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        if (now - userData.lastDaily < dayInMs) {
            const timeLeft = dayInMs - (now - userData.lastDaily);
            const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            
            return message.reply(`⏰ Mozesz odebrac nagrode za ${hoursLeft}h ${minutesLeft}m!`);
        }

        const reward = 100;
        userData.coins += reward;
        userData.lastDaily = now;
        userMoney.set(userId, userData);

        const dailyEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 Codzienne Monety!')
            .setDescription(`Otrzymales **${reward}** monet!\nTeraz masz **${userData.coins}** monet.`)
            .setTimestamp();

        message.reply({ embeds: [dailyEmbed] });
    }

    // Komenda: !warn (ostrzezenie)
    if (command === 'warn' || command === 'ostrzez') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Nie masz uprawnien do dawania ostrzezen!');
        }

        const member = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'Brak powodu';

        if (!member) {
            return message.reply('❌ Oznacz uzytkownika! Uzycie: `!warn @uzytkownik powod`');
        }

        const warnings = userWarnings.get(member.id) || [];
        warnings.push({
            reason: reason,
            moderator: message.author.tag,
            timestamp: Date.now()
        });
        userWarnings.set(member.id, warnings);

        const warnEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Ostrzezenie')
            .addFields(
                { name: 'Uzytkownik', value: `${member.user.tag}`, inline: true },
                { name: 'Moderator', value: `${message.author.tag}`, inline: true },
                { name: 'Liczba ostrzezen', value: `${warnings.length}/3`, inline: true },
                { name: 'Powod', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [warnEmbed] });

        // Auto-ban po 3 ostrzezeniach
        if (warnings.length >= 3) {
            try {
                await member.ban({ reason: 'Auto-ban: 3 ostrzezenia' });
                message.channel.send(`🔨 ${member.user.tag} zostal zbanowany za 3 ostrzezenia!`);
                userWarnings.delete(member.id);
            } catch (error) {
                console.error('Blad auto-ban:', error);
            }
        }

        // Log
        const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
        if (logsChannel) {
            logsChannel.send({ embeds: [warnEmbed] });
        }
    }

    // Komenda: !warnings (lista ostrzezen)
    if (command === 'warnings' || command === 'ostrzezenia') {
        const targetUser = message.mentions.users.first() || message.author;
        const warnings = userWarnings.get(targetUser.id) || [];

        if (warnings.length === 0) {
            return message.reply(`✅ ${targetUser.username} nie ma ostrzezen!`);
        }

        let warningsText = '';
        warnings.forEach((warn, index) => {
            const date = new Date(warn.timestamp).toLocaleDateString('pl-PL');
            warningsText += `**${index + 1}.** ${warn.reason}\n└ Moderator: ${warn.moderator} | Data: ${date}\n\n`;
        });

        const warningsEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`⚠️ Ostrzezenia ${targetUser.username}`)
            .setDescription(warningsText)
            .addFields({ name: 'Suma', value: `${warnings.length}/3 ostrzezen`, inline: false })
            .setTimestamp();

        message.reply({ embeds: [warningsEmbed] });
    }

    // Komenda: !8ball (magiczna kula)
    if (command === '8ball') {
        const question = args.join(' ');
        if (!question) {
            return message.reply('❌ Zadaj pytanie! Uzycie: `!8ball czy to zadziala?`');
        }

        const answers = [
            'Tak', 'Nie', 'Moze', 'Zdecydowanie tak', 'Zdecydowanie nie',
            'Nie moge teraz powiedziec', 'Sprobuj ponownie pozniej', 'Lepiej nie',
            'Nie licz na to', 'Moje zrodla mowia nie', 'Wygląda dobrze',
            'Bez watpienia', 'Tak - zdecydowanie', 'Mozesz na to liczyc'
        ];
        const answer = answers[Math.floor(Math.random() * answers.length)];

        const ballEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎱 Magiczna Kula')
            .addFields(
                { name: 'Pytanie', value: question, inline: false },
                { name: 'Odpowiedz', value: answer, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [ballEmbed] });
    }

    // Komenda: !coinflip (rzut moneta)
    if (command === 'coinflip' || command === 'moneta') {
        const result = Math.random() < 0.5 ? 'Orzel' : 'Reszka';
        const emoji = result === 'Orzel' ? '🦅' : '🪙';

        const coinEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🪙 Rzut Moneta')
            .setDescription(`${emoji} **${result}**!`)
            .setTimestamp();

        message.reply({ embeds: [coinEmbed] });
    }

    // Komenda: !roll (losowa liczba)
    if (command === 'roll' || command === 'losuj') {
        const range = args[0] || '1-100';
        const [min, max] = range.split('-').map(Number);

        if (!min || !max || min >= max) {
            return message.reply('❌ Nieprawidlowy zakres! Uzycie: `!roll 1-100`');
        }

        const result = Math.floor(Math.random() * (max - min + 1)) + min;

        const rollEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎲 Losowanie')
            .setDescription(`Wylosowano: **${result}** (z zakresu ${min}-${max})`)
            .setTimestamp();

        message.reply({ embeds: [rollEmbed] });
    }

    // Komenda: !avatar (pokaz avatar)
    if (command === 'avatar' || command === 'awatar') {
        const targetUser = message.mentions.users.first() || message.author;
        const avatarURL = targetUser.displayAvatarURL({ size: 1024, dynamic: true });

        const avatarEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`🖼️ Avatar ${targetUser.username}`)
            .setImage(avatarURL)
            .setTimestamp();

        message.reply({ embeds: [avatarEmbed] });
    }

    // Komenda: !giveaway (konkurs)
    if (command === 'giveaway' || command === 'konkurs') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Nie masz uprawnien do tworzenia giveaway!');
        }

        const duration = args[0];
        const prize = args.slice(1).join(' ');

        if (!duration || !prize) {
            return message.reply('❌ Uzycie: `!giveaway 10m Nagroda`\nPrzyklad: `!giveaway 1h Discord Nitro`');
        }

        // Parsowanie czasu
        const timeMatch = duration.match(/^(\d+)([smhd])$/);
        if (!timeMatch) {
            return message.reply('❌ Nieprawidlowy format czasu! Uzyj: 10s, 5m, 2h, 1d');
        }

        const timeValue = parseInt(timeMatch[1]);
        const timeUnit = timeMatch[2];
        let milliseconds;

        switch (timeUnit) {
            case 's': milliseconds = timeValue * 1000; break;
            case 'm': milliseconds = timeValue * 60 * 1000; break;
            case 'h': milliseconds = timeValue * 60 * 60 * 1000; break;
            case 'd': milliseconds = timeValue * 24 * 60 * 60 * 1000; break;
        }

        const endTime = Date.now() + milliseconds;

        const giveawayEmbed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎉 GIVEAWAY!')
            .setDescription(`**Nagroda:** ${prize}\n**Czas:** ${duration}\n**Koniec:** <t:${Math.floor(endTime / 1000)}:R>\n\nKliknij 🎉 aby wziac udzial!`)
            .setFooter({ text: `Organizator: ${message.author.username}` })
            .setTimestamp(endTime);

        const giveawayMsg = await message.channel.send({ embeds: [giveawayEmbed] });
        await giveawayMsg.react('🎉');

        activeGiveaways.set(giveawayMsg.id, {
            prize: prize,
            endTime: endTime,
            channelId: message.channel.id,
            hostId: message.author.id
        });

        // Timer do zakonczenia
        setTimeout(async () => {
            const giveawayData = activeGiveaways.get(giveawayMsg.id);
            if (!giveawayData) return;

            const fetchedMsg = await message.channel.messages.fetch(giveawayMsg.id).catch(() => null);
            if (!fetchedMsg) return;

            const reaction = fetchedMsg.reactions.cache.get('🎉');
            if (!reaction) return;

            const users = await reaction.users.fetch();
            const participants = users.filter(u => !u.bot);

            if (participants.size === 0) {
                const noWinnerEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🎉 Giveaway Zakonczony')
                    .setDescription(`**Nagroda:** ${giveawayData.prize}\n\n❌ Brak uczestnikow!`)
                    .setTimestamp();

                message.channel.send({ embeds: [noWinnerEmbed] });
            } else {
                const winner = participants.random();

                const winnerEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Giveaway Zakonczony!')
                    .setDescription(`**Nagroda:** ${giveawayData.prize}\n\n🎊 Zwyciezca: ${winner}!\n\nGratulacje!`)
                    .setTimestamp();

                message.channel.send({ content: `${winner}`, embeds: [winnerEmbed] });
            }

            activeGiveaways.delete(giveawayMsg.id);
        }, milliseconds);

        message.delete().catch(() => {});
    }

    // Komenda: !blackjack (gra w blackjacka)
    if (command === 'blackjack' || command === 'bj') {
        let bet;
        
        // Sprawdz czy gracz chce postawic wszystko
        if (args[0] && args[0].toLowerCase() === 'all') {
            const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
            bet = userData.coins;
            
            if (bet < 10) {
                return message.reply('❌ Nie masz wystarczajaco monet! Minimalny zaklad: 10 monet');
            }
        } else {
            bet = parseInt(args[0]);
            
            if (!bet || bet < 10) {
                return message.reply('❌ Uzycie: `!blackjack <zaklad>` lub `!blackjack all`\nMinimalny zaklad: 10 monet\nPrzyklad: `!blackjack 50` lub `!bj all`');
            }
        }
        
        const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        if (userData.coins < bet) {
            return message.reply(`❌ Nie masz wystarczajaco monet! Masz: ${userData.coins}, potrzebujesz: ${bet}`);
        }
        
        if (activeBlackjackGames.has(message.author.id)) {
            return message.reply('❌ Masz juz aktywna gre blackjack!');
        }
        
        // Odejmij zaklad
        userData.coins -= bet;
        userMoney.set(message.author.id, userData);
        
        // Utworz talie i rozdaj karty
        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        
        const playerValue = calculateHand(playerHand);
        const dealerValue = calculateHand(dealerHand);
        
        // Sprawdz blackjack
        if (playerValue === 21) {
            const winAmount = Math.floor(bet * 2.5);
            userData.coins += winAmount;
            userMoney.set(message.author.id, userData);
            
            const bjEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🃏 BLACKJACK!')
                .setDescription(`**BLACKJACK! Wygrales ${winAmount} monet!**`)
                .addFields(
                    { name: '🎴 Twoje karty', value: `${formatHand(playerHand)} = **21**`, inline: false },
                    { name: '🎴 Karty krupiera', value: `${formatHand(dealerHand)} = ${dealerValue}`, inline: false },
                    { name: '💰 Bilans', value: `Zaklad: ${bet} | Wygrana: ${winAmount} | Saldo: ${userData.coins}`, inline: false }
                )
                .setTimestamp();
            
            return message.reply({ embeds: [bjEmbed] });
        }
        
        // Zapisz gre
        activeBlackjackGames.set(message.author.id, {
            deck: deck,
            playerHand: playerHand,
            dealerHand: dealerHand,
            bet: bet,
            channelId: message.channel.id
        });
        
        const hitButton = new ButtonBuilder()
            .setCustomId(`bj_hit_${message.author.id}`)
            .setLabel('🃏 HIT - Dobierz')
            .setStyle(ButtonStyle.Primary);
        
        const standButton = new ButtonBuilder()
            .setCustomId(`bj_stand_${message.author.id}`)
            .setLabel('✋ STAND - Pasuj')
            .setStyle(ButtonStyle.Danger);
        
        const buttonRow = new ActionRowBuilder()
            .addComponents(hitButton, standButton);
        
        const gameEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🃏 BLACKJACK')
            .setDescription(`Zaklad: **${bet}** monet`)
            .addFields(
                { name: '🎴 Twoje karty', value: `${formatHand(playerHand)} = **${playerValue}**`, inline: false },
                { name: '🎴 Karty krupiera', value: `${formatHand(dealerHand, true)} = ?`, inline: false },
                { name: '🎮 Akcje', value: 'Kliknij przycisk ponizej!', inline: false }
            )
            .setFooter({ text: 'Masz 60 sekund na ruch' })
            .setTimestamp();
        
        message.reply({ embeds: [gameEmbed], components: [buttonRow] });
        
        // Timeout 60 sekund
        setTimeout(() => {
            if (activeBlackjackGames.has(message.author.id)) {
                activeBlackjackGames.delete(message.author.id);
                message.channel.send(`${message.author} Gra blackjack wygasla (timeout)!`);
            }
        }, 60000);
    }
    
    // Komenda: !hit (dobierz karte)
    if (command === 'hit' || command === 'dobierz') {
        const game = activeBlackjackGames.get(message.author.id);
        
        if (!game) {
            return message.reply('❌ Nie masz aktywnej gry blackjack! Uzyj `!blackjack <zaklad>`');
        }
        
        if (game.channelId !== message.channel.id) {
            return message.reply('❌ Gra jest na innym kanale!');
        }
        
        // Dobierz karte
        game.playerHand.push(game.deck.pop());
        const playerValue = calculateHand(game.playerHand);
        
        // Sprawdz przegrana
        if (playerValue > 21) {
            activeBlackjackGames.delete(message.author.id);
            
            const bustEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🃏 BLACKJACK - PRZEGRANA')
                .setDescription(`**BUST! Przegrales ${game.bet} monet!**`)
                .addFields(
                    { name: '🎴 Twoje karty', value: `${formatHand(game.playerHand)} = **${playerValue}**`, inline: false },
                    { name: '🎴 Karty krupiera', value: `${formatHand(game.dealerHand)} = ${calculateHand(game.dealerHand)}`, inline: false },
                    { name: '💰 Bilans', value: `Zaklad: ${game.bet} | Przegrana: -${game.bet} | Saldo: ${(userMoney.get(message.author.id) || { coins: 0 }).coins}`, inline: false }
                )
                .setTimestamp();
            
            return message.reply({ embeds: [bustEmbed] });
        }
        
        // Kontynuuj gre
        const hitButton = new ButtonBuilder()
            .setCustomId(`bj_hit_${message.author.id}`)
            .setLabel('🃏 HIT - Dobierz')
            .setStyle(ButtonStyle.Primary);
        
        const standButton = new ButtonBuilder()
            .setCustomId(`bj_stand_${message.author.id}`)
            .setLabel('✋ STAND - Pasuj')
            .setStyle(ButtonStyle.Danger);
        
        const buttonRow = new ActionRowBuilder()
            .addComponents(hitButton, standButton);
        
        const gameEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🃏 BLACKJACK')
            .setDescription(`Zaklad: **${game.bet}** monet`)
            .addFields(
                { name: '🎴 Twoje karty', value: `${formatHand(game.playerHand)} = **${playerValue}**`, inline: false },
                { name: '🎴 Karty krupiera', value: `${formatHand(game.dealerHand, true)} = ?`, inline: false },
                { name: '🎮 Akcje', value: 'Kliknij przycisk ponizej!', inline: false }
            )
            .setTimestamp();
        
        message.reply({ embeds: [gameEmbed], components: [buttonRow] });
    }
    
    // Komenda: !stand (pasuj)
    if (command === 'stand' || command === 'pasuj') {
        const game = activeBlackjackGames.get(message.author.id);
        
        if (!game) {
            return message.reply('❌ Nie masz aktywnej gry blackjack! Uzyj `!blackjack <zaklad>`');
        }
        
        if (game.channelId !== message.channel.id) {
            return message.reply('❌ Gra jest na innym kanale!');
        }
        
        activeBlackjackGames.delete(message.author.id);
        
        // Krupier dobiera karty (do 17)
        let dealerValue = calculateHand(game.dealerHand);
        while (dealerValue < 17) {
            game.dealerHand.push(game.deck.pop());
            dealerValue = calculateHand(game.dealerHand);
        }
        
        const playerValue = calculateHand(game.playerHand);
        const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        let result = '';
        let color = '';
        let winAmount = 0;
        
        if (dealerValue > 21) {
            // Krupier bust - gracz wygrywa
            result = `**WYGRANA! Krupier bust! +${game.bet * 2} monet**`;
            color = '#00FF00';
            winAmount = game.bet * 2;
            userData.coins += winAmount;
        } else if (playerValue > dealerValue) {
            // Gracz wygrywa
            result = `**WYGRANA! +${game.bet * 2} monet**`;
            color = '#00FF00';
            winAmount = game.bet * 2;
            userData.coins += winAmount;
        } else if (playerValue === dealerValue) {
            // Remis
            result = `**REMIS! Zwrot ${game.bet} monet**`;
            color = '#FFA500';
            winAmount = game.bet;
            userData.coins += winAmount;
        } else {
            // Krupier wygrywa
            result = `**PRZEGRANA! -${game.bet} monet**`;
            color = '#FF0000';
        }
        
        userMoney.set(message.author.id, userData);
        
        const resultEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🃏 BLACKJACK - WYNIK')
            .setDescription(result)
            .addFields(
                { name: '🎴 Twoje karty', value: `${formatHand(game.playerHand)} = **${playerValue}**`, inline: false },
                { name: '🎴 Karty krupiera', value: `${formatHand(game.dealerHand)} = **${dealerValue}**`, inline: false },
                { name: '💰 Bilans', value: `Zaklad: ${game.bet} | Wynik: ${winAmount > 0 ? '+' : ''}${winAmount - game.bet} | Saldo: ${userData.coins}`, inline: false }
            )
            .setTimestamp();
        
        message.reply({ embeds: [resultEmbed] });
    }

    // Komenda: !slots (automat do gier)
    if (command === 'slots' || command === 'slot') {
        const bet = parseInt(args[0]);
        
        if (!bet || bet < 10) {
            return message.reply('❌ Uzycie: `!slots <zaklad>`\nMinimalny zaklad: 10 monet\nPrzyklad: `!slots 50`');
        }
        
        const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        if (userData.coins < bet) {
            return message.reply(`❌ Nie masz wystarczajaco monet! Masz: ${userData.coins}`);
        }
        
        // Odejmij zaklad
        userData.coins -= bet;
        
        const symbols = ['🍒', '🍋', '🍊', '🍇', '🍉', '🍓', '💎', '7️⃣'];
        const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot3 = symbols[Math.floor(Math.random() * symbols.length)];
        
        let winAmount = 0;
        let result = '';
        let color = '';
        
        if (slot1 === slot2 && slot2 === slot3) {
            // 3 takie same - JACKPOT!
            if (slot1 === '7️⃣') {
                winAmount = bet * 5; // x5 za 777
                result = '🎰 JACKPOT 777! 🎰';
                color = '#FFD700';
            } else if (slot1 === '💎') {
                winAmount = bet * 4; // x4 za diamenty
                result = '💎 MEGA WYGRANA! 💎';
                color = '#00FFFF';
            } else {
                winAmount = bet * 3; // x3 za inne
                result = '🎉 WYGRANA! 🎉';
                color = '#00FF00';
            }
        } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            // 2 takie same
            winAmount = Math.floor(bet * 1.5); // x1.5
            result = '✨ Mala wygrana!';
            color = '#FFA500';
        } else {
            // Przegrana
            result = '❌ Przegrana!';
            color = '#FF0000';
        }
        
        userData.coins += winAmount;
        userMoney.set(message.author.id, userData);
        
        const slotsEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎰 SLOT MACHINE')
            .setDescription(`${slot1} | ${slot2} | ${slot3}\n\n${result}`)
            .addFields(
                { name: 'Zaklad', value: `${bet} monet`, inline: true },
                { name: 'Wygrana', value: `${winAmount} monet`, inline: true },
                { name: 'Saldo', value: `${userData.coins} monet`, inline: true }
            )
            .setTimestamp();
        
        message.reply({ embeds: [slotsEmbed] });
        saveData();
    }

    // Komenda: !work (praca)
    if (command === 'work' || command === 'praca') {
        const userId = message.author.id;
        const now = Date.now();
        const lastWork = workCooldowns.get(userId) || 0;
        const timeLeft = workCooldownTime - (now - lastWork);
        
        if (timeLeft > 0) {
            const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
            return message.reply(`⏰ Jestes zmeczony! Mozesz pracowac ponownie za ${minutesLeft} minut!`);
        }
        
        const jobs = [
            { name: 'Gornik', emoji: '⛏️', min: 100, max: 200 },
            { name: 'Farmer', emoji: '🌾', min: 80, max: 150 },
            { name: 'Rybak', emoji: '🎣', min: 70, max: 140 },
            { name: 'Drwal', emoji: '🪓', min: 90, max: 170 },
            { name: 'Handlarz', emoji: '💼', min: 120, max: 250 },
            { name: 'Budowniczy', emoji: '🏗️', min: 110, max: 220 },
            { name: 'Kucharz', emoji: '👨‍🍳', min: 85, max: 160 }
        ];
        
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
        
        const userData = userMoney.get(userId) || { coins: 0, lastDaily: 0 };
        userData.coins += earned;
        userMoney.set(userId, userData);
        
        workCooldowns.set(userId, now);
        
        const workEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💼 PRACA')
            .setDescription(`${job.emoji} Pracowales jako **${job.name}** i zarobiłes **${earned}** monet!`)
            .addFields({ name: '💰 Nowe saldo', value: `${userData.coins} monet`, inline: false })
            .setFooter({ text: 'Nastepna praca za 1 godzine' })
            .setTimestamp();
        
        message.reply({ embeds: [workEmbed] });
        saveData();
    }

    // Komenda: !cf (coinflip z zakladem)
    if (command === 'cf' || command === 'coinflip-bet') {
        const bet = parseInt(args[0]);
        const choice = args[1]?.toLowerCase();
        
        if (!bet || !choice || (choice !== 'orzel' && choice !== 'reszka')) {
            return message.reply('❌ Uzycie: `!cf <zaklad> <orzel/reszka>`\nPrzyklad: `!cf 100 orzel`');
        }
        
        if (bet < 10) {
            return message.reply('❌ Minimalny zaklad: 10 monet');
        }
        
        const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        if (userData.coins < bet) {
            return message.reply(`❌ Nie masz wystarczajaco monet! Masz: ${userData.coins}`);
        }
        
        userData.coins -= bet;
        
        const result = Math.random() < 0.5 ? 'orzel' : 'reszka';
        const won = result === choice;
        
        let color, title, description;
        
        if (won) {
            const winAmount = bet * 2;
            userData.coins += winAmount;
            color = '#00FF00';
            title = '🎉 WYGRANA!';
            description = `Moneta pokazala: **${result}**\nWygrales **${bet}** monet!`;
        } else {
            color = '#FF0000';
            title = '❌ PRZEGRANA!';
            description = `Moneta pokazala: **${result}**\nPrzegrales **${bet}** monet!`;
        }
        
        userMoney.set(message.author.id, userData);
        
        const cfEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .addFields(
                { name: 'Twoj wybor', value: choice, inline: true },
                { name: 'Wynik', value: result, inline: true },
                { name: 'Saldo', value: `${userData.coins} monet`, inline: true }
            )
            .setTimestamp();
        
        message.reply({ embeds: [cfEmbed] });
        saveData();
    }

    // Komenda: !roulette (ruletka)
    if (command === 'roulette' || command === 'ruletka') {
        const bet = parseInt(args[0]);
        const choice = args[1]?.toLowerCase();
        
        if (!bet || !choice || !['czerwone', 'czarne', 'zielone', 'red', 'black', 'green'].includes(choice)) {
            return message.reply('❌ Uzycie: `!roulette <zaklad> <kolor>`\nKolory: czerwone, czarne, zielone\nPrzyklad: `!roulette 100 czerwone`');
        }
        
        if (bet < 10) {
            return message.reply('❌ Minimalny zaklad: 10 monet');
        }
        
        const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        if (userData.coins < bet) {
            return message.reply(`❌ Nie masz wystarczajaco monet! Masz: ${userData.coins}`);
        }
        
        userData.coins -= bet;
        
        // Normalizuj wybor
        let normalizedChoice = choice;
        if (choice === 'red') normalizedChoice = 'czerwone';
        if (choice === 'black') normalizedChoice = 'czarne';
        if (choice === 'green') normalizedChoice = 'zielone';
        
        // Losowanie (zielone 1/37, czerwone 18/37, czarne 18/37)
        const rand = Math.random();
        let result;
        
        if (rand < 1/37) {
            result = 'zielone';
        } else if (rand < 19/37) {
            result = 'czerwone';
        } else {
            result = 'czarne';
        }
        
        let winAmount = 0;
        let color, title;
        
        if (result === normalizedChoice) {
            if (result === 'zielone') {
                winAmount = bet * 14; // x14 za zielone
                color = '#00FF00';
                title = '💚 JACKPOT! ZIELONE!';
            } else {
                winAmount = bet * 2; // x2 za czerwone/czarne
                color = result === 'czerwone' ? '#FF0000' : '#000000';
                title = `🎉 WYGRANA! ${result.toUpperCase()}!`;
            }
            userData.coins += winAmount;
        } else {
            color = '#808080';
            title = '❌ PRZEGRANA!';
        }
        
        userMoney.set(message.author.id, userData);
        
        const rouletteEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(`Kulka zatrzymala sie na: **${result}**`)
            .addFields(
                { name: 'Twoj wybor', value: normalizedChoice, inline: true },
                { name: 'Wynik', value: result, inline: true },
                { name: 'Wygrana', value: `${winAmount > 0 ? '+' : ''}${winAmount - bet} monet`, inline: true },
                { name: 'Saldo', value: `${userData.coins} monet`, inline: false }
            )
            .setTimestamp();
        
        message.reply({ embeds: [rouletteEmbed] });
        saveData();
    }

    // Komenda: !okradnij (okradnij gracza)
    if (command === 'okradnij' || command === 'rob' || command === 'steal') {
        const targetUser = message.mentions.users.first();
        
        if (!targetUser) {
            return message.reply('❌ Uzycie: `!okradnij @user`\nPrzyklad: `!okradnij @user`');
        }
        
        if (targetUser.id === message.author.id) {
            return message.reply('❌ Nie mozesz okrasc samego siebie!');
        }
        
        if (targetUser.bot) {
            return message.reply('❌ Nie mozesz okrasc bota!');
        }
        
        // Sprawdz cooldown
        const now = Date.now();
        const lastRob = robCooldowns.get(message.author.id) || 0;
        const timeLeft = robCooldownTime - (now - lastRob);
        
        if (timeLeft > 0) {
            const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
            return message.reply(`⏰ Musisz poczekac jeszcze ${minutesLeft} minut przed kolejna proba!`);
        }
        
        const thiefData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        const victimData = userMoney.get(targetUser.id) || { coins: 0, lastDaily: 0 };
        
        if (thiefData.coins < 50) {
            return message.reply('❌ Potrzebujesz minimum 50 monet zeby sprobowac okrasc kogos!');
        }
        
        if (victimData.coins < 100) {
            return message.reply(`❌ ${targetUser.username} ma za malo monet (minimum 100) zeby go okrasc!`);
        }
        
        // Ustaw cooldown
        robCooldowns.set(message.author.id, now);
        
        // Losowanie (20% szansa na sukces)
        const success = Math.random() < robSuccessChance;
        
        if (success) {
            // SUKCES - ukradnij 25% monet ofiary
            const stolenAmount = Math.floor(victimData.coins * robStealPercent);
            
            thiefData.coins += stolenAmount;
            victimData.coins -= stolenAmount;
            
            userMoney.set(message.author.id, thiefData);
            userMoney.set(targetUser.id, victimData);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💰 OKRADZIONO POMYSLNIE!')
                .setDescription(`${message.author} ukradl **${stolenAmount}** monet od ${targetUser}!`)
                .addFields(
                    { name: '🎯 Zlodziej', value: `${message.author.username}\nNowe saldo: ${thiefData.coins} monet`, inline: true },
                    { name: '😢 Ofiara', value: `${targetUser.username}\nNowe saldo: ${victimData.coins} monet`, inline: true },
                    { name: '💎 Ukradzione', value: `${stolenAmount} monet (25%)`, inline: false }
                )
                .setFooter({ text: 'Nastepna proba za 1 godzine' })
                .setTimestamp();
            
            message.channel.send({ embeds: [successEmbed] });
            
            // Powiadom ofiarę
            try {
                const victimDM = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚨 ZOSTALES OKRADZIONY!')
                    .setDescription(`${message.author.username} ukradl ci **${stolenAmount}** monet!`)
                    .addFields({ name: 'Nowe saldo', value: `${victimData.coins} monet`, inline: false })
                    .setTimestamp();
                
                await targetUser.send({ embeds: [victimDM] });
            } catch (error) {
                // Uzytkownik ma wylaczone DM
            }
        } else {
            // PORAZKA - strac 15% swoich monet
            const penalty = Math.floor(thiefData.coins * robFailPenalty);
            thiefData.coins -= penalty;
            
            userMoney.set(message.author.id, thiefData);
            
            const failEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚔 ZLAPANY!')
                .setDescription(`${message.author} zostal zlapany podczas proby okradzenia ${targetUser}!`)
                .addFields(
                    { name: '😭 Kara', value: `Straciles **${penalty}** monet (15%)`, inline: false },
                    { name: '💰 Nowe saldo', value: `${thiefData.coins} monet`, inline: false }
                )
                .setFooter({ text: 'Nastepna proba za 1 godzine' })
                .setTimestamp();
            
            message.channel.send({ embeds: [failEmbed] });
        }
        
        saveData();
    }

    // Komenda: !shop (sklep)
    if (command === 'shop' || command === 'sklep') {
        let shopText = '';
        for (const [itemId, item] of Object.entries(shopItems)) {
            shopText += `${item.emoji} **${item.name}** - ${item.price} monet\n`;
            if (item.duration) shopText += `└ Czas trwania: 24h\n`;
            if (item.uses) shopText += `└ Uzycia: ${item.uses}\n`;
            shopText += `└ Kup: \`!buy ${itemId}\`\n\n`;
        }
        
        const shopEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🛒 SKLEP')
            .setDescription(shopText)
            .setFooter({ text: 'Uzyj !buy <przedmiot> aby kupic' })
            .setTimestamp();
        
        message.reply({ embeds: [shopEmbed] });
    }

    // Komenda: !buy (kup przedmiot)
    if (command === 'buy' || command === 'kup') {
        const itemId = args[0];
        const item = shopItems[itemId];
        
        if (!item) {
            return message.reply('❌ Nie ma takiego przedmiotu! Uzyj `!shop` aby zobaczyc dostepne przedmioty.');
        }
        
        const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        if (userData.coins < item.price) {
            return message.reply(`❌ Nie masz wystarczajaco monet! Potrzebujesz: ${item.price}, masz: ${userData.coins}`);
        }
        
        userData.coins -= item.price;
        userMoney.set(message.author.id, userData);
        
        // Dodaj do inventory
        const inventory = userInventory.get(message.author.id) || { items: [] };
        inventory.items.push({
            id: itemId,
            name: item.name,
            boughtAt: Date.now(),
            duration: item.duration,
            uses: item.uses
        });
        userInventory.set(message.author.id, inventory);
        
        const buyEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Zakup pomyslny!')
            .setDescription(`Kupiles: ${item.emoji} **${item.name}**`)
            .addFields({ name: 'Nowe saldo', value: `${userData.coins} monet`, inline: false })
            .setTimestamp();
        
        message.reply({ embeds: [buyEmbed] });
        saveData();
    }

    // Komenda: !inventory (ekwipunek)
    if (command === 'inventory' || command === 'inv' || command === 'ekwipunek') {
        const inventory = userInventory.get(message.author.id) || { items: [] };
        
        if (inventory.items.length === 0) {
            return message.reply('❌ Twoj ekwipunek jest pusty! Kup cos w `!shop`');
        }
        
        let invText = '';
        inventory.items.forEach((item, index) => {
            const shopItem = shopItems[item.id];
            invText += `${index + 1}. ${shopItem.emoji} **${item.name}**\n`;
            if (item.uses) invText += `└ Pozostale uzycia: ${item.uses}\n`;
            if (item.duration) {
                const timeLeft = item.duration - (Date.now() - item.boughtAt);
                if (timeLeft > 0) {
                    const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000));
                    invText += `└ Pozostaly czas: ${hoursLeft}h\n`;
                } else {
                    invText += `└ Wygaslo\n`;
                }
            }
        });
        
        const invEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎒 EKWIPUNEK')
            .setDescription(invText)
            .setTimestamp();
        
        message.reply({ embeds: [invEmbed] });
    }

    // Komenda: !achievements (osiagniecia)
    if (command === 'achievements' || command === 'osiagniecia' || command === 'ach') {
        const userAchs = userAchievements.get(message.author.id) || [];
        
        let achText = '';
        for (const [achId, ach] of Object.entries(achievements)) {
            const hasIt = userAchs.includes(achId);
            achText += `${hasIt ? '✅' : '❌'} ${ach.emoji} **${ach.name}**\n`;
            achText += `└ Nagroda: ${ach.reward} monet\n\n`;
        }
        
        const achEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 OSIAGNIECIA')
            .setDescription(achText)
            .addFields({ name: 'Postep', value: `${userAchs.length}/${Object.keys(achievements).length}`, inline: false })
            .setTimestamp();
        
        message.reply({ embeds: [achEmbed] });
    }

    // Komenda: !lottery (loteria)
    if (command === 'lottery' || command === 'loteria' || command === 'los') {
        const ticketPrice = 100;
        const userData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        if (userData.coins < ticketPrice) {
            return message.reply(`❌ Nie masz wystarczajaco monet! Los kosztuje ${ticketPrice} monet.`);
        }
        
        userData.coins -= ticketPrice;
        userMoney.set(message.author.id, userData);
        
        lotteryPool += ticketPrice;
        const currentTickets = lotteryTickets.get(message.author.id) || 0;
        lotteryTickets.set(message.author.id, currentTickets + 1);
        
        const timeUntilDraw = 24 * 60 * 60 * 1000 - (Date.now() - lastLotteryDraw);
        const hoursLeft = Math.ceil(timeUntilDraw / (60 * 60 * 1000));
        
        const lotteryEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎫 LOTERIA')
            .setDescription(`Kupiles los za ${ticketPrice} monet!`)
            .addFields(
                { name: 'Twoje losy', value: `${currentTickets + 1}`, inline: true },
                { name: 'Pula nagrod', value: `${lotteryPool} monet`, inline: true },
                { name: 'Losowanie za', value: `~${hoursLeft}h`, inline: true }
            )
            .setFooter({ text: 'Losowanie co 24h' })
            .setTimestamp();
        
        message.reply({ embeds: [lotteryEmbed] });
        saveData();
    }

    // Komenda: !duel (pojedynek)
    if (command === 'duel' || command === 'pojedynek') {
        const opponent = message.mentions.users.first();
        const bet = parseInt(args[1]);
        
        if (!opponent || !bet) {
            return message.reply('❌ Uzycie: `!duel @user <zaklad>`\nPrzyklad: `!duel @user 100`');
        }
        
        if (opponent.id === message.author.id) {
            return message.reply('❌ Nie mozesz wyzwac samego siebie!');
        }
        
        if (opponent.bot) {
            return message.reply('❌ Nie mozesz wyzwac bota!');
        }
        
        if (bet < 10) {
            return message.reply('❌ Minimalny zaklad: 10 monet');
        }
        
        const challengerData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        const opponentData = userMoney.get(opponent.id) || { coins: 0, lastDaily: 0 };
        
        if (challengerData.coins < bet) {
            return message.reply(`❌ Nie masz wystarczajaco monet! Masz: ${challengerData.coins}`);
        }
        
        if (opponentData.coins < bet) {
            return message.reply(`❌ ${opponent.username} nie ma wystarczajaco monet!`);
        }
        
        if (activeDuels.has(message.author.id)) {
            return message.reply('❌ Masz juz aktywny pojedynek!');
        }
        
        if (activeDuels.has(opponent.id)) {
            return message.reply('❌ Ten gracz ma juz aktywny pojedynek!');
        }
        
        // Zapisz pojedynek
        activeDuels.set(message.author.id, {
            opponent: opponent.id,
            bet: bet,
            channelId: message.channel.id
        });
        
        const duelEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('⚔️ WYZWANIE NA POJEDYNEK!')
            .setDescription(`${message.author} wzywa ${opponent} na pojedynek!\n\nZaklad: **${bet}** monet\n\n${opponent}, wpisz \`!accept\` aby przyjac lub \`!decline\` aby odrzucic!`)
            .setFooter({ text: 'Wyzwanie wygasa za 60 sekund' })
            .setTimestamp();
        
        message.channel.send({ embeds: [duelEmbed] });
        
        // Timeout 60 sekund
        setTimeout(() => {
            if (activeDuels.has(message.author.id)) {
                activeDuels.delete(message.author.id);
                message.channel.send(`${opponent} nie przyjal wyzwania. Pojedynek anulowany.`);
            }
        }, 60000);
    }

    // Komenda: !accept (przyjmij pojedynek)
    if (command === 'accept' || command === 'przyjmij') {
        let duelData = null;
        let challengerId = null;
        
        for (const [userId, data] of activeDuels.entries()) {
            if (data.opponent === message.author.id && data.channelId === message.channel.id) {
                duelData = data;
                challengerId = userId;
                break;
            }
        }
        
        if (!duelData) {
            return message.reply('❌ Nie masz zadnego wyzwania na pojedynek!');
        }
        
        activeDuels.delete(challengerId);
        
        const challengerData = userMoney.get(challengerId) || { coins: 0, lastDaily: 0 };
        const opponentData = userMoney.get(message.author.id) || { coins: 0, lastDaily: 0 };
        
        // Odejmij zaklady
        challengerData.coins -= duelData.bet;
        opponentData.coins -= duelData.bet;
        
        // Kamien, papier, nozyce
        const choices = ['kamien', 'papier', 'nozyce'];
        const challengerChoice = choices[Math.floor(Math.random() * choices.length)];
        const opponentChoice = choices[Math.floor(Math.random() * choices.length)];
        
        let winner = null;
        let result = '';
        
        if (challengerChoice === opponentChoice) {
            result = 'REMIS!';
            challengerData.coins += duelData.bet;
            opponentData.coins += duelData.bet;
        } else if (
            (challengerChoice === 'kamien' && opponentChoice === 'nozyce') ||
            (challengerChoice === 'papier' && opponentChoice === 'kamien') ||
            (challengerChoice === 'nozyce' && opponentChoice === 'papier')
        ) {
            winner = challengerId;
            result = `<@${challengerId}> WYGRYWA!`;
            challengerData.coins += duelData.bet * 2;
        } else {
            winner = message.author.id;
            result = `${message.author} WYGRYWA!`;
            opponentData.coins += duelData.bet * 2;
        }
        
        userMoney.set(challengerId, challengerData);
        userMoney.set(message.author.id, opponentData);
        
        const resultEmbed = new EmbedBuilder()
            .setColor(winner ? '#00FF00' : '#FFA500')
            .setTitle('⚔️ WYNIK POJEDYNKU')
            .setDescription(result)
            .addFields(
                { name: `<@${challengerId}>`, value: `${challengerChoice} 🪨📄✂️`, inline: true },
                { name: `${message.author}`, value: `${opponentChoice} 🪨📄✂️`, inline: true }
            )
            .setTimestamp();
        
        message.channel.send({ embeds: [resultEmbed] });
        saveData();
    }

    // Komenda: !decline (odrzuc pojedynek)
    if (command === 'decline' || command === 'odrzuc') {
        let duelData = null;
        let challengerId = null;
        
        for (const [userId, data] of activeDuels.entries()) {
            if (data.opponent === message.author.id && data.channelId === message.channel.id) {
                duelData = data;
                challengerId = userId;
                break;
            }
        }
        
        if (!duelData) {
            return message.reply('❌ Nie masz zadnego wyzwania na pojedynek!');
        }
        
        activeDuels.delete(challengerId);
        message.reply(`❌ Odrzuciles wyzwanie na pojedynek od <@${challengerId}>`);
    }

    // Komenda: !zabawa (info o komendach zabawy)
    if (command === 'zabawa' || command === 'fun') {
        const zabawEmbed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎮 ᴢᴀʙᴀᴡᴀ')
            .setDescription('Wszystkie komendy zwiazane z zabawa, poziomami i monetami!')
            .addFields(
                { name: '⭐ System Poziomow', value: '`!rank` - Twoj poziom\n`!leaderboard` - Top 10', inline: false },
                { name: '💰 System Monet', value: '`!balance` - Monety\n`!daily` - Codzienne 100 monet\n`!work` - Pracuj (1h cooldown)', inline: false },
                { name: '🎰 Gry Hazardowe', value: '`!bj <zaklad>` - Blackjack\n`!slots <zaklad>` - Automaty\n`!cf <zaklad> orzel/reszka` - Coinflip\n`!roulette <zaklad> kolor` - Ruletka', inline: false },
                { name: '🛒 Sklep & Ekwipunek', value: '`!shop` - Zobacz sklep\n`!buy <przedmiot>` - Kup\n`!inventory` - Ekwipunek', inline: false },
                { name: '🏆 Inne', value: '`!achievements` - Osiagniecia\n`!lottery` - Kup los (100 monet)\n`!duel @user <zaklad>` - Pojedynek\n`!okradnij @user` - Okradnij (20%)', inline: false },
                { name: '🎲 Fun', value: '`!8ball` `!coinflip` `!roll` `!avatar`', inline: false }
            )
            .setFooter({ text: 'Baw sie dobrze!' })
            .setTimestamp();

        message.reply({ embeds: [zabawEmbed] });
    }

    // Komenda: !serverinfo (info o serwerze)
    if (command === 'serverinfo' || command === 'serwer') {
        const guild = message.guild;
        const owner = await guild.fetchOwner();
        
        const serverEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { name: '👑 Właściciel', value: `${owner.user.tag}`, inline: true },
                { name: '📅 Utworzony', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🆔 ID', value: guild.id, inline: true },
                { name: '👥 Członkowie', value: `${guild.memberCount}`, inline: true },
                { name: '📝 Kanały', value: `${guild.channels.cache.size}`, inline: true },
                { name: '🎭 Role', value: `${guild.roles.cache.size}`, inline: true },
                { name: '😀 Emoji', value: `${guild.emojis.cache.size}`, inline: true },
                { name: '🚀 Boosty', value: `Poziom ${guild.premiumTier} (${guild.premiumSubscriptionCount} boostów)`, inline: true },
                { name: '🔒 Poziom weryfikacji', value: `${guild.verificationLevel}`, inline: true }
            )
            .setTimestamp();
        
        if (guild.description) {
            serverEmbed.setDescription(guild.description);
        }
        
        message.reply({ embeds: [serverEmbed] });
    }

    // Komenda: !userinfo (info o użytkowniku)
    if (command === 'userinfo' || command === 'whois') {
        const targetUser = message.mentions.members.first() || message.member;
        
        const roles = targetUser.roles.cache
            .filter(role => role.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
            .slice(0, 10);
        
        const userEmbed = new EmbedBuilder()
            .setColor(targetUser.displayHexColor || '#0099FF')
            .setTitle(`👤 ${targetUser.user.tag}`)
            .setThumbnail(targetUser.user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '🆔 ID', value: targetUser.id, inline: true },
                { name: '📅 Konto utworzone', value: `<t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Dołączył', value: `<t:${Math.floor(targetUser.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Role', value: roles.length > 0 ? roles.join(', ') : 'Brak ról', inline: false },
                { name: '🤖 Bot', value: targetUser.user.bot ? 'Tak' : 'Nie', inline: true },
                { name: '🎨 Kolor', value: targetUser.displayHexColor || 'Domyślny', inline: true }
            )
            .setTimestamp();
        
        if (targetUser.nickname) {
            userEmbed.addFields({ name: '📝 Nick', value: targetUser.nickname, inline: true });
        }
        
        message.reply({ embeds: [userEmbed] });
    }

    // Komenda: !roleinfo (info o roli)
    if (command === 'roleinfo') {
        const roleName = args.join(' ');
        const role = message.mentions.roles.first() || message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        
        if (!role) {
            return message.reply('❌ Nie znaleziono roli! Uzycie: `!roleinfo @rola` lub `!roleinfo nazwa`');
        }
        
        const permissions = role.permissions.toArray().slice(0, 10).join(', ') || 'Brak specjalnych uprawnień';
        
        const roleEmbed = new EmbedBuilder()
            .setColor(role.hexColor || '#0099FF')
            .setTitle(`🎭 ${role.name}`)
            .addFields(
                { name: '🆔 ID', value: role.id, inline: true },
                { name: '🎨 Kolor', value: role.hexColor || 'Domyślny', inline: true },
                { name: '👥 Członkowie', value: `${role.members.size}`, inline: true },
                { name: '📊 Pozycja', value: `${role.position}`, inline: true },
                { name: '📅 Utworzona', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🔒 Uprawnienia', value: permissions, inline: false }
            )
            .setTimestamp();
        
        message.reply({ embeds: [roleEmbed] });
    }

    // Komenda: !embed (tworzenie embeda)
    if (command === 'embed' || command === 'createembed') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do tworzenia embedow! (tylko admini)');
        }
        
        message.reply('📢 **Tworzenie Embeda**\n\nWpisz dane w formacie:\n```\nTytul: Twoj tytul\nOpis: Twoj opis\nKolor: #FF0000\n```');
        
        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, max: 1 });
        
        collector.on('collect', async m => {
            const lines = m.content.split('\n');
            let title = 'Embed';
            let description = '';
            let color = '#0099FF';
            
            lines.forEach(line => {
                if (line.toLowerCase().startsWith('tytul:')) {
                    title = line.substring(6).trim();
                } else if (line.toLowerCase().startsWith('opis:')) {
                    description = line.substring(5).trim();
                } else if (line.toLowerCase().startsWith('kolor:')) {
                    color = line.substring(6).trim();
                }
            });
            
            const customEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();
            
            await message.channel.send({ embeds: [customEmbed] });
            m.delete().catch(() => {});
        });
    }

    // Komenda: !slowmode (ustaw slowmode)
    if (command === 'slowmode' || command === 'slow') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Nie masz uprawnien do zarzadzania kanalami!');
        }
        
        const time = args[0];
        
        if (!time || time === 'off' || time === '0') {
            await message.channel.setRateLimitPerUser(0);
            return message.reply('✅ Slowmode wylaczony!');
        }
        
        const timeMatch = time.match(/^(\d+)([smh])$/);
        if (!timeMatch) {
            return message.reply('❌ Uzycie: `!slowmode <czas>` lub `!slowmode off`\nPrzyklad: `!slowmode 5s`, `!slowmode 1m`, `!slowmode 2h`');
        }
        
        const timeValue = parseInt(timeMatch[1]);
        const timeUnit = timeMatch[2];
        let seconds;
        
        switch (timeUnit) {
            case 's': seconds = timeValue; break;
            case 'm': seconds = timeValue * 60; break;
            case 'h': seconds = timeValue * 60 * 60; break;
        }
        
        if (seconds > 21600) {
            return message.reply('❌ Maksymalny slowmode to 6 godzin (21600 sekund)!');
        }
        
        await message.channel.setRateLimitPerUser(seconds);
        
        const slowEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏱️ Slowmode Ustawiony')
            .setDescription(`Slowmode na tym kanale: **${time}**`)
            .addFields({ name: 'Moderator', value: message.author.tag, inline: true })
            .setTimestamp();
        
        message.reply({ embeds: [slowEmbed] });
        
        // Log
        const logsChannel = message.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
        if (logsChannel) {
            logsChannel.send({ embeds: [slowEmbed] });
        }
    }

    // Komenda: !ogloszenie (system ogłoszeń)
    if (command === 'ogloszenie' || command === 'announce') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) &&
            !message.member.roles.cache.has(process.env.MODERATOR_ROLE_ID) &&
            !message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            return message.reply('❌ Nie masz uprawnien do wysylania ogloszen!');
        }

        const content = args.join(' ');
        if (!content) {
            return message.reply('❌ Uzycie: `!ogloszenie <treść>`');
        }

        const announceEmbed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('📣 Ogłoszenie')
            .setDescription(content)
            .setFooter({ text: `Ogłoszenie od: ${message.author.tag}` })
            .setTimestamp();

        await message.channel.send({ content: '@everyone', embeds: [announceEmbed] });
        message.delete().catch(() => {});
    }

    // Komenda: !notatka (notatki o graczach)
    if (command === 'notatka' || command === 'note') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers) &&
            !message.member.roles.cache.has(process.env.MODERATOR_ROLE_ID) &&
            !message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            return message.reply('❌ Nie masz uprawnien do dodawania notatek!');
        }

        const target = message.mentions.members.first();

        // !notatka @gracz - wyswietl notatki
        if (target && args.length === 1) {
            const notes = playerNotes.get(target.id) || [];
            if (notes.length === 0) {
                return message.reply(`📋 Brak notatek o graczu **${target.user.tag}**`);
            }
            const notesEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`📋 Notatki o ${target.user.tag}`)
                .setDescription(notes.map((n, i) => `**${i + 1}.** [${n.date}] ${n.mod}: ${n.text}`).join('\n'))
                .setTimestamp();
            return message.reply({ embeds: [notesEmbed] });
        }

        // !notatka @gracz <treść> - dodaj notatke
        if (target && args.length > 1) {
            const noteText = args.slice(1).join(' ');

            // !notatka @gracz usun <numer> - usun notatke
            if (args[1] === 'usun' || args[1] === 'usuń') {
                const num = parseInt(args[2]);
                const notes = playerNotes.get(target.id) || [];
                if (!num || num < 1 || num > notes.length) {
                    return message.reply(`❌ Podaj prawidłowy numer notatki (1-${notes.length})`);
                }
                notes.splice(num - 1, 1);
                playerNotes.set(target.id, notes);
                saveData();
                return message.reply(`✅ Usunięto notatkę nr **${num}** o graczu **${target.user.tag}**`);
            }

            const notes = playerNotes.get(target.id) || [];
            notes.push({
                text: noteText,
                mod: message.author.tag,
                date: new Date().toLocaleDateString('pl-PL')
            });
            playerNotes.set(target.id, notes);
            saveData();

            const noteEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📋 Notatka dodana')
                .addFields(
                    { name: 'Gracz', value: target.user.tag, inline: true },
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Treść', value: noteText, inline: false }
                )
                .setTimestamp();
            return message.reply({ embeds: [noteEmbed] });
        }

        return message.reply('❌ Uzycie:\n`!notatka @gracz` - wyświetl notatki\n`!notatka @gracz <treść>` - dodaj notatkę\n`!notatka @gracz usun <numer>` - usuń notatkę');
    }

    // Komenda: !sticky (przypięta wiadomość na dole)
    if (command === 'sticky' || command === 'przypnij') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Nie masz uprawnien do przypinania wiadomosci!');
        }
        
        const content = args.join(' ');
        
        if (!content) {
            // Usun sticky
            const sticky = stickyMessages.get(message.channel.id);
            if (sticky) {
                try {
                    const msg = await message.channel.messages.fetch(sticky.messageId);
                    await msg.delete();
                } catch (error) {}
                stickyMessages.delete(message.channel.id);
                return message.reply('✅ Sticky message usunieta!');
            } else {
                return message.reply('❌ Brak sticky message na tym kanale!\nUzycie: `!sticky <wiadomosc>`');
            }
        }
        
        // Usun stara sticky jesli istnieje
        const oldSticky = stickyMessages.get(message.channel.id);
        if (oldSticky) {
            try {
                const oldMsg = await message.channel.messages.fetch(oldSticky.messageId);
                await oldMsg.delete();
            } catch (error) {}
        }
        
        const stickyEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setDescription(`📌 ${content}`)
            .setFooter({ text: 'Sticky Message' })
            .setTimestamp();
        
        const stickyMsg = await message.channel.send({ embeds: [stickyEmbed] });
        
        stickyMessages.set(message.channel.id, {
            content: content,
            messageId: stickyMsg.id
        });
        
        message.delete().catch(() => {});
    }

    // Komenda: !voicestats (statystyki voice)
    if (command === 'voicestats' || command === 'voice') {
        const targetUser = message.mentions.users.first() || message.author;
        const totalSeconds = voiceTotalTime.get(targetUser.id) || 0;
        
        // Dodaj aktualny czas jesli jest na voice
        let currentSeconds = 0;
        const joinTime = voiceJoinTimes.get(targetUser.id);
        if (joinTime) {
            currentSeconds = Math.floor((Date.now() - joinTime) / 1000);
        }
        
        const allSeconds = totalSeconds + currentSeconds;
        const hours = Math.floor(allSeconds / 3600);
        const minutes = Math.floor((allSeconds % 3600) / 60);
        
        const voiceEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎤 Statystyki Voice')
            .setDescription(`Statystyki dla ${targetUser}`)
            .addFields(
                { name: 'Calkowity czas', value: `${hours}h ${minutes}m`, inline: true },
                { name: 'Status', value: joinTime ? '🟢 Na kanale' : '⚫ Offline', inline: true },
                { name: 'Zarobione monety', value: `${Math.floor(allSeconds / 60)} monet`, inline: true }
            )
            .setFooter({ text: '1 moneta za kazda minute na voice' })
            .setTimestamp();
        
        message.reply({ embeds: [voiceEmbed] });
    }

    // Komenda: !poll (ankieta)
    if (command === 'poll' || command === 'ankieta') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Nie masz uprawnien do tworzenia ankiet!');
        }

        const pollArgs = message.content.match(/"([^"]+)"/g);
        if (!pollArgs || pollArgs.length < 3) {
            return message.reply('❌ Uzycie: `!poll "Pytanie?" "Opcja1" "Opcja2" "Opcja3"`\nMaksymalnie 10 opcji.');
        }

        const question = pollArgs[0].replace(/"/g, '');
        const options = pollArgs.slice(1, 11).map(opt => opt.replace(/"/g, ''));

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        let optionsText = '';
        options.forEach((opt, index) => {
            optionsText += `${emojis[index]} ${opt}\n`;
        });

        const pollEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📊 ANKIETA')
            .setDescription(`**${question}**\n\n${optionsText}`)
            .setFooter({ text: `Ankieta utworzona przez ${message.author.username}` })
            .setTimestamp();

        const pollMsg = await message.channel.send({ embeds: [pollEmbed] });

        for (let i = 0; i < options.length; i++) {
            await pollMsg.react(emojis[i]);
        }

        message.delete().catch(() => {});
    }

    // Komenda: !save (zapisz dane - tylko admin)
    if (command === 'save' || command === 'zapisz') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do tej komendy!');
        }

        saveData();
        message.reply('✅ Dane zapisane pomyslnie!');
    }

    // Komenda: !addmoney (dodaj monety - tylko admin)
    if (command === 'addmoney' || command === 'dodajmonety') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do tej komendy!');
        }

        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!targetUser || !amount) {
            return message.reply('❌ Uzycie: `!addmoney @user ilosc`\nPrzyklad: `!addmoney @user 5000`');
        }

        const userData = userMoney.get(targetUser.id) || { coins: 0, lastDaily: 0 };
        userData.coins += amount;
        userMoney.set(targetUser.id, userData);

        const moneyEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 Monety Dodane')
            .setDescription(`Dodano **${amount}** monet dla ${targetUser}`)
            .addFields({ name: 'Nowe saldo', value: `${userData.coins} monet`, inline: false })
            .setTimestamp();

        message.reply({ embeds: [moneyEmbed] });
        saveData();
    }

    // Komenda: !removemoney (usun monety - tylko admin)
    if (command === 'removemoney' || command === 'usunmonety') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do tej komendy!');
        }

        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!targetUser || !amount) {
            return message.reply('❌ Uzycie: `!removemoney @user ilosc`\nPrzyklad: `!removemoney @user 1000`');
        }

        const userData = userMoney.get(targetUser.id) || { coins: 0, lastDaily: 0 };
        userData.coins = Math.max(0, userData.coins - amount);
        userMoney.set(targetUser.id, userData);

        const moneyEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💰 Monety Usuniete')
            .setDescription(`Usunieto **${amount}** monet dla ${targetUser}`)
            .addFields({ name: 'Nowe saldo', value: `${userData.coins} monet`, inline: false })
            .setTimestamp();

        message.reply({ embeds: [moneyEmbed] });
        saveData();
    }

    // Komenda: !setmoney (ustaw monety - tylko admin)
    if (command === 'setmoney' || command === 'ustawmonety') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Nie masz uprawnien do tej komendy!');
        }

        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!targetUser || amount === undefined) {
            return message.reply('❌ Uzycie: `!setmoney @user ilosc`\nPrzyklad: `!setmoney @user 5000`');
        }

        const userData = userMoney.get(targetUser.id) || { coins: 0, lastDaily: 0 };
        userData.coins = Math.max(0, amount);
        userMoney.set(targetUser.id, userData);

        const moneyEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 Monety Ustawione')
            .setDescription(`Ustawiono **${amount}** monet dla ${targetUser}`)
            .setTimestamp();

        message.reply({ embeds: [moneyEmbed] });
        saveData();
    }
});

// Event: Interakcje (przyciski i menu)
client.on('interactionCreate', async (interaction) => {
    // Obsługa dropdown menu ticketów
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const selected = interaction.values[0];

        const existingTicket = activeTickets.get(interaction.user.id);
        if (existingTicket) {
            return interaction.reply({ content: `❌ Masz już otwarty ticket: <#${existingTicket}>`, ephemeral: true });
        }

        const categories = {
            rekrutacja: { name: 'rekrutacja', title: '⚔️ Rekrutacja do klanu', color: '#00FF00', desc: 'Opisz dlaczego chcesz dołączyć do klanu JAPAN.\n\n• Nick w Minecraft\n• Wiek\n• Poprzednie klany\n• Ile robisz winów dziennie/tygodniowo?\n• Ile możesz wpłacić rubinów na start?' },
            opuszczenie: { name: 'opuszczenie', title: '🚪 Opuszczenie klanu', color: '#FF6B00', desc: 'Opisz powód opuszczenia klanu.' },
            inne: { name: 'inne', title: '💬 Inne', color: '#0099FF', desc: 'Opisz swój problem lub pytanie.' },
            zarzad: { name: 'zarzad', title: '⚖️ Sprawa do zarządu', color: '#FF0000', desc: 'Opisz sprawę do zarządu klanu.' }
        };

        const cat = categories[selected];

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `${cat.name}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: process.env.TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: process.env.MODERATOR_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: process.env.ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ]
            });

            activeTickets.set(interaction.user.id, ticketChannel.id);

            const ticketEmbed = new EmbedBuilder()
                .setColor(cat.color)
                .setTitle(cat.title)
                .setDescription(`Witaj ${interaction.user}!\n\n${cat.desc}`)
                .setFooter({ text: 'Aby zamknąć ticket, kliknij przycisk poniżej' })
                .setTimestamp();

            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Zamknij ticket')
                        .setStyle(ButtonStyle.Danger)
                );

            await ticketChannel.send({ content: `${interaction.user} <@&${process.env.MODERATOR_ROLE_ID}>`, embeds: [ticketEmbed], components: [closeButton] });
            await interaction.reply({ content: `✅ Utworzono ticket: ${ticketChannel}`, ephemeral: true });

            const logsChannel = interaction.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(cat.color)
                    .setTitle(`${cat.title} — nowy ticket`)
                    .setDescription(`${interaction.user.tag} otworzył ticket`)
                    .addFields({ name: 'Kanał', value: `${ticketChannel}`, inline: true })
                    .setTimestamp();
                logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Nie udało się utworzyć ticketu!', ephemeral: true });
        }
        return;
    }

    if (!interaction.isButton()) return;

    // Przyciski Blackjack - HIT
    if (interaction.customId.startsWith('bj_hit_')) {
        const userId = interaction.customId.split('_')[2];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ To nie twoja gra!', ephemeral: true });
        }
        
        const game = activeBlackjackGames.get(userId);
        if (!game) {
            return interaction.reply({ content: '❌ Gra wygasla!', ephemeral: true });
        }
        
        // Dobierz karte
        game.playerHand.push(game.deck.pop());
        const playerValue = calculateHand(game.playerHand);
        
        // Sprawdz przegrana
        if (playerValue > 21) {
            activeBlackjackGames.delete(userId);
            
            const bustEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🃏 BLACKJACK - PRZEGRANA')
                .setDescription(`**BUST! Przegrales ${game.bet} monet!**`)
                .addFields(
                    { name: '🎴 Twoje karty', value: `${formatHand(game.playerHand)} = **${playerValue}**`, inline: false },
                    { name: '🎴 Karty krupiera', value: `${formatHand(game.dealerHand)} = ${calculateHand(game.dealerHand)}`, inline: false },
                    { name: '💰 Bilans', value: `Zaklad: ${game.bet} | Przegrana: -${game.bet} | Saldo: ${(userMoney.get(userId) || { coins: 0 }).coins}`, inline: false }
                )
                .setTimestamp();
            
            return interaction.update({ embeds: [bustEmbed], components: [] });
        }
        
        // Kontynuuj gre
        const hitButton = new ButtonBuilder()
            .setCustomId(`bj_hit_${userId}`)
            .setLabel('🃏 HIT - Dobierz')
            .setStyle(ButtonStyle.Primary);
        
        const standButton = new ButtonBuilder()
            .setCustomId(`bj_stand_${userId}`)
            .setLabel('✋ STAND - Pasuj')
            .setStyle(ButtonStyle.Danger);
        
        const buttonRow = new ActionRowBuilder()
            .addComponents(hitButton, standButton);
        
        const gameEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🃏 BLACKJACK')
            .setDescription(`Zaklad: **${game.bet}** monet`)
            .addFields(
                { name: '🎴 Twoje karty', value: `${formatHand(game.playerHand)} = **${playerValue}**`, inline: false },
                { name: '🎴 Karty krupiera', value: `${formatHand(game.dealerHand, true)} = ?`, inline: false },
                { name: '🎮 Akcje', value: 'Kliknij przycisk ponizej!', inline: false }
            )
            .setTimestamp();
        
        await interaction.update({ embeds: [gameEmbed], components: [buttonRow] });
    }

    // Przyciski Blackjack - STAND
    if (interaction.customId.startsWith('bj_stand_')) {
        const userId = interaction.customId.split('_')[2];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ To nie twoja gra!', ephemeral: true });
        }
        
        const game = activeBlackjackGames.get(userId);
        if (!game) {
            return interaction.reply({ content: '❌ Gra wygasla!', ephemeral: true });
        }
        
        activeBlackjackGames.delete(userId);
        
        // Krupier dobiera karty (do 17)
        let dealerValue = calculateHand(game.dealerHand);
        while (dealerValue < 17) {
            game.dealerHand.push(game.deck.pop());
            dealerValue = calculateHand(game.dealerHand);
        }
        
        const playerValue = calculateHand(game.playerHand);
        const userData = userMoney.get(userId) || { coins: 0, lastDaily: 0 };
        
        let result = '';
        let color = '';
        let winAmount = 0;
        
        if (dealerValue > 21) {
            // Krupier bust - gracz wygrywa
            result = `**WYGRANA! Krupier bust! +${game.bet * 2} monet**`;
            color = '#00FF00';
            winAmount = game.bet * 2;
            userData.coins += winAmount;
        } else if (playerValue > dealerValue) {
            // Gracz wygrywa
            result = `**WYGRANA! +${game.bet * 2} monet**`;
            color = '#00FF00';
            winAmount = game.bet * 2;
            userData.coins += winAmount;
        } else if (playerValue === dealerValue) {
            // Remis
            result = `**REMIS! Zwrot ${game.bet} monet**`;
            color = '#FFA500';
            winAmount = game.bet;
            userData.coins += winAmount;
        } else {
            // Krupier wygrywa
            result = `**PRZEGRANA! -${game.bet} monet**`;
            color = '#FF0000';
        }
        
        userMoney.set(userId, userData);
        
        const resultEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🃏 BLACKJACK - WYNIK')
            .setDescription(result)
            .addFields(
                { name: '🎴 Twoje karty', value: `${formatHand(game.playerHand)} = **${playerValue}**`, inline: false },
                { name: '🎴 Karty krupiera', value: `${formatHand(game.dealerHand)} = **${dealerValue}**`, inline: false },
                { name: '💰 Bilans', value: `Zaklad: ${game.bet} | Wynik: ${winAmount > 0 ? '+' : ''}${winAmount - game.bet} | Saldo: ${userData.coins}`, inline: false }
            )
            .setTimestamp();
        
        await interaction.update({ embeds: [resultEmbed], components: [] });
    }

    // Przycisk weryfikacji
    if (interaction.customId === 'verify') {
        const verifiedRole = interaction.guild.roles.cache.get(process.env.VERIFIED_ROLE_ID);
        
        if (!verifiedRole) {
            return interaction.reply({ content: '❌ Rola zweryfikowanego nie zostala skonfigurowana!', ephemeral: true });
        }

        if (interaction.member.roles.cache.has(verifiedRole.id)) {
            return interaction.reply({ content: '✅ Jestes juz zweryfikowany!', ephemeral: true });
        }

        try {
            await interaction.member.roles.add(verifiedRole);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Weryfikacja pomyslna!')
                .setDescription('Witamy na serwerze! Teraz masz dostep do wszystkich kanalow.')
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log
            const logsChannel = interaction.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Nowa weryfikacja')
                    .setDescription(`${interaction.user.tag} (${interaction.user.id})`)
                    .setTimestamp();
                
                logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('BLAD WERYFIKACJI:', error);
            const errorMsg = error.message || 'Nieznany blad';
            interaction.reply({ content: `❌ Blad weryfikacji: ${errorMsg}\n\nSprawdz czy:\n1. Bot ma uprawnienie "Manage Roles"\n2. Rola bota jest WYZEJ niz rola "Zweryfikowany"`, ephemeral: true }).catch(() => {});
        }
    }

    // Przycisk tworzenia ticketu
    if (interaction.customId === 'create_ticket') {
        // Sprawdz czy uzytkownik ma juz otwarty ticket
        const existingTicket = activeTickets.get(interaction.user.id);
        if (existingTicket) {
            return interaction.reply({ content: `❌ Masz juz otwarte podanie: <#${existingTicket}>`, ephemeral: true });
        }

        try {
            // Utworz kanal ticketu
            const ticketChannel = await interaction.guild.channels.create({
                name: `podanie-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: process.env.TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: process.env.MODERATOR_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: process.env.ADMIN_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            activeTickets.set(interaction.user.id, ticketChannel.id);

            const ticketEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('🎫 Nowe podanie')
                .setDescription(`Witaj ${interaction.user}! Dziekujemy za zainteresowanie naszym klanem.`)
                .addFields(
                    { name: '📝 Prosze podaj:', value: '• Twoj nick w Minecraft\n• Wiek\n• Poprzednie klany\n• Doswiadczenie w grze\n• Dlaczego chcesz dolaczyc do nas?\n• Ile jestes w stanie wplacic rubinow na start?\n• Ile robisz winow dziennie/tygodniowo?', inline: false },
                    { name: '⏱️ Czas odpowiedzi', value: 'Odpowiemy w ciagu 3 godzin', inline: false }
                )
                .setFooter({ text: 'Aby zamknac podanie, kliknij przycisk ponizej' })
                .setTimestamp();

            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Zamknij podanie')
                        .setStyle(ButtonStyle.Danger)
                );

            await ticketChannel.send({ content: `${interaction.user} <@&${process.env.MODERATOR_ROLE_ID}>`, embeds: [ticketEmbed], components: [closeButton] });

            await interaction.reply({ content: `✅ Utworzono podanie: ${ticketChannel}`, ephemeral: true });

            // Log
            const logsChannel = interaction.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('🎫 Nowe podanie')
                    .setDescription(`${interaction.user.tag} utworzyl podanie`)
                    .addFields({ name: 'Kanal', value: `${ticketChannel}`, inline: true })
                    .setTimestamp();
                
                logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Nie udalo sie utworzyc podania!', ephemeral: true });
        }
    }

    // Przycisk strefy pomocy
    if (interaction.customId === 'create_help') {
        // Sprawdz czy uzytkownik ma juz otwarty ticket
        const existingTicket = activeTickets.get(interaction.user.id);
        if (existingTicket) {
            return interaction.reply({ content: `❌ Masz juz otwarty ticket: <#${existingTicket}>`, ephemeral: true });
        }

        try {
            // Utworz kanal pomocy
            const helpChannel = await interaction.guild.channels.create({
                name: `pomoc-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: process.env.TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: process.env.MODERATOR_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: process.env.ADMIN_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            activeTickets.set(interaction.user.id, helpChannel.id);

            const helpEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🆘 Strefa pomocy')
                .setDescription(`Witaj ${interaction.user}! Opisz swoj problem, a moderacja pomoze Ci jak najszybciej.`)
                .addFields(
                    { name: '📝 Opisz problem:', value: 'Napisz szczegolowo z czym potrzebujesz pomocy', inline: false },
                    { name: '⏱️ Czas odpowiedzi', value: 'Odpowiemy w ciagu 3 godzin', inline: false }
                )
                .setFooter({ text: 'Aby zamknac ticket, kliknij przycisk ponizej' })
                .setTimestamp();

            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Zamknij ticket')
                        .setStyle(ButtonStyle.Danger)
                );

            await helpChannel.send({ content: `${interaction.user} <@&${process.env.MODERATOR_ROLE_ID}>`, embeds: [helpEmbed], components: [closeButton] });

            await interaction.reply({ content: `✅ Utworzono ticket pomocy: ${helpChannel}`, ephemeral: true });

            // Log
            const logsChannel = interaction.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🆘 Nowy ticket pomocy')
                    .setDescription(`${interaction.user.tag} utworzyl ticket pomocy`)
                    .addFields({ name: 'Kanal', value: `${helpChannel}`, inline: true })
                    .setTimestamp();
                
                logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Nie udalo sie utworzyc ticketu pomocy!', ephemeral: true });
        }
    }

    // Przycisk zamykania ticketu
    if (interaction.customId === 'close_ticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && 
            !interaction.member.roles.cache.has(process.env.MODERATOR_ROLE_ID) &&
            !interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '❌ Tylko moderatorzy moga zamykac podania!', ephemeral: true });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Potwierdzenie')
            .setDescription('Czy na pewno chcesz zamknac to podanie?')
            .setTimestamp();

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('✅ Tak, zamknij')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('❌ Anuluj')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [confirmEmbed], components: [confirmButtons], ephemeral: true });
    }

    // Potwierdzenie zamkniecia
    if (interaction.customId === 'confirm_close') {
        try {
            // Usun z mapy aktywnych ticketow
            for (const [userId, channelId] of activeTickets.entries()) {
                if (channelId === interaction.channel.id) {
                    activeTickets.delete(userId);
                    break;
                }
            }

            await interaction.update({ content: '🔒 Zamykanie podania...', embeds: [], components: [] });
            
            // Przenies do archiwum zamiast usuwac
            const archiveCategoryId = process.env.TICKET_ARCHIVE_CATEGORY_ID;
            
            if (archiveCategoryId) {
                // Przenies kanal do kategorii archiwum
                await interaction.channel.setParent(archiveCategoryId);
                
                // Zmien nazwe na "zamkniete-"
                const newName = interaction.channel.name.replace('podanie-', 'zamkniete-');
                await interaction.channel.setName(newName);
                
                // Zablokuj wysylanie wiadomosci dla wszystkich oprocz adminow
                await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                    SendMessages: false
                });
                
                // Wyslij wiadomosc o zamknieciu
                const closedEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🔒 Podanie zamkniete')
                    .setDescription(`Podanie zostalo zamkniete przez ${interaction.user}`)
                    .setTimestamp();
                
                await interaction.channel.send({ embeds: [closedEmbed] });
            } else {
                // Jesli nie ma kategorii archiwum, usun kanal (stare zachowanie)
                setTimeout(async () => {
                    await interaction.channel.delete();
                }, 3000);
            }

            // Log
            const logsChannel = interaction.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🔒 Podanie zamkniete')
                    .setDescription(`Podanie zostalo zamkniete przez ${interaction.user.tag}`)
                    .addFields({ name: 'Kanal', value: interaction.channel.name, inline: true })
                    .setTimestamp();
                
                logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Anulowanie zamkniecia
    if (interaction.customId === 'cancel_close') {
        await interaction.update({ content: '✅ Anulowano zamykanie podania.', embeds: [], components: [] });
    }
});

// Zapisz dane przy wylaczeniu bota
process.on('SIGINT', () => {
    console.log('\n⚠️ Wylaczanie bota...');
    saveData();
    console.log('✅ Dane zapisane. Do zobaczenia!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️ Wylaczanie bota...');
    saveData();
    console.log('✅ Dane zapisane. Do zobaczenia!');
    process.exit(0);
});

// Keep-alive HTTP server (wymagany przez Railway/hosting)
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Discord dziala!');
});
server.listen(process.env.PORT || 3000, () => {
    console.log(`Keep-alive server uruchomiony na porcie ${process.env.PORT || 3000}`);
});

// Logowanie bota
client.login(process.env.DISCORD_TOKEN);
