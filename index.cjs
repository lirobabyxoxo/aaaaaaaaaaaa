const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionFlagsBits, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences
    ]
});

// Collections para comandos
client.commands = new Collection();
client.slashCommands = new Collection();

// Configurações do bot
const config = {
    prefix: process.env.PREFIX || '.',
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    tenorApiKey: process.env.TENOR_API_KEY,
    discloudApiKey: process.env.DISCLOUD_API_KEY,
    botName: process.env.BOT_NAME || 'Saya',
    ownerId: process.env.BOT_OWNER_ID
};

// Cores do tema Yakuza (preto e vermelho neon)
const colors = {
    primary: 0x000000,  // Preto
    accent: 0x000000,   // Vermelho neon
    success: 0x000000,  // Verde para sucesso
    error: 0x000000     // Vermelho para erro
};

// Sistema de status alternados
const statusList = [
    { type: ActivityType.Playing, name: '.help | Saya' },
    { type: ActivityType.Watching, name: 'Be a nice guy' },
    { type: ActivityType.Playing, name: 'created by Liro' },
    { type: ActivityType.Streaming, name: 'É os Guri', url: 'https://twitch.tv/saya' },
    { type: ActivityType.Playing, name: 'Gonning and Sleep' },
    { type: ActivityType.Playing, name: 'Zzz' },
    { type: ActivityType.Listening, name: 'suas conversas' },
    { type: ActivityType.Watching, name: 'você dormir' },
    { type: ActivityType.Playing, name: 'com emojis' },
    { type: ActivityType.Listening, name: 'música lo-fi' },
    { type: ActivityType.Watching, name: 'o servidor crescer' },
    { type: ActivityType.Playing, name: 'moderando o chat' },
    { type: ActivityType.Competing, name: 'quem é mais demoníaco' },
    { type: ActivityType.Playing, name: 'escondendo corpos' },
    { type: ActivityType.Listening, name: 'gritos no porão' }
];

let currentStatusIndex = 0;

// Função para alterar status
function changeStatus() {
    const status = statusList[currentStatusIndex];
    client.user.setActivity(status.name, { 
        type: status.type,
        url: status.url || undefined
    });
    currentStatusIndex = (currentStatusIndex + 1) % statusList.length;
}


// Sistema de armazenamento para configurações (igual ao verify.cjs)
const configFile = path.join(__dirname, 'server_configs.json');

function loadConfigs() {
    try {
        if (fs.existsSync(configFile)) {
            const data = fs.readFileSync(configFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
    return {};
}

function getServerConfig(guildId) {
    const configs = loadConfigs();
    return configs[guildId] || null;
}

// Função para criar embed padrão do Yakuza
function createYakuzaEmbed(title, description, color = colors.primary) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: 'Saya — by liro' })
        .setTimestamp();
}

// Sistema de monitoramento de status
function startStatusMonitoring() {
    console.log('Sistema de monitoramento de status iniciado');
    
    // Verificar a cada 5 minutos
    setInterval(async () => {
        await checkAllMonitoredUsers();
    }, 5 * 60 * 1000); // 5 minutos
}

async function checkAllMonitoredUsers() {
    try {
        const configs = loadConfigs();
        
        for (const guildId in configs) {
            const serverConfig = configs[guildId];
            
            if (!serverConfig.statusChecker || !serverConfig.statusChecker.enabled || !serverConfig.statusChecker.monitoredUsers) {
                continue;
            }
            
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;
            
            const monitoredUsers = serverConfig.statusChecker.monitoredUsers;
            const removedUsers = [];
            
            for (const userId in monitoredUsers) {
                const userData = monitoredUsers[userId];
                
                try {
                    const member = await guild.members.fetch(userId);
                    const presence = member.presence;
                    
                    let hasRequiredText = false;
                    
                    // Só verificar se o usuário está online/visível
                    if (presence && presence.status !== 'offline') {
                        if (presence.activities) {
                            // Verificar atividades customizadas (status personalizado)
                            for (const activity of presence.activities) {
                                if (activity.type === 4 && activity.state && activity.state.includes(userData.requiredText)) {
                                    hasRequiredText = true;
                                    break;
                                }
                            }
                        }
                        
                        // Se o usuário não tem mais o texto no status (e está online), remover o cargo
                        if (!hasRequiredText) {
                        const role = guild.roles.cache.get(userData.roleId);
                        
                        if (role && member.roles.cache.has(userData.roleId)) {
                            await member.roles.remove(userData.roleId);
                            
                            // Notificar o usuário por DM
                            try {
                                const user = await client.users.fetch(userId);
                                const dmEmbed = createYakuzaEmbed(
                                    'Cargo Removido ❌',
                                    `Seu cargo **${role.name}** foi removido do servidor **${guild.name}** porque você removeu o texto obrigatório do seu status personalizado.\n\n` +
                                    `**Texto obrigatório:** ${userData.requiredText}\n\n` +
                                    'Adicione o texto novamente em seu status personalizado e clique em "Obter Cargo" para recuperar o cargo.',
                                    colors.error
                                );
                                await user.send({ embeds: [dmEmbed] });
                            } catch (dmError) {
                                console.log(`Não foi possível enviar DM para ${member.user.tag} sobre remoção de cargo`);
                            }
                            
                            console.log(`Cargo ${role.name} removido de ${member.user.tag} por não ter o texto no status`);
                        }
                        
                            // Remover usuário do monitoramento
                            removedUsers.push(userId);
                        }
                    }
                    
                } catch (error) {
                    // Se o usuário não está mais no servidor, remover do monitoramento
                    if (error.code === 10007 || error.message.includes('Unknown Member')) {
                        removedUsers.push(userId);
                    }
                }
            }
            
            // Remover usuários que não precisam mais ser monitorados
            if (removedUsers.length > 0) {
                for (const userId of removedUsers) {
                    delete serverConfig.statusChecker.monitoredUsers[userId];
                }
                
                configs[guildId] = serverConfig;
                saveConfigs(configs);
            }
        }
        
    } catch (error) {
        console.error('Erro no monitoramento de status:', error);
    }
}

function saveConfigs(configs) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(configs, null, 2));
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
    }
}

// Função para tratar o botão de verificação
async function handleVerificationButton(interaction, client, config, colors, createYakuzaEmbed) {
    const serverConfig = getServerConfig(interaction.guild.id);
    
    if (!serverConfig) {
        const notConfiguredEmbed = createYakuzaEmbed(
            'Sistema Não Configurado',
            'O sistema de verificação ainda não foi configurado neste servidor.',
            colors.error
        );
        return interaction.reply({ embeds: [notConfiguredEmbed], ephemeral: true });
    }
    
    const member = interaction.member;
    const verifiedRole = interaction.guild.roles.cache.get(serverConfig.verifiedRole);
    
    // Verifica se a pessoa já está verificada
    if (member.roles.cache.has(serverConfig.verifiedRole)) {
        const alreadyVerifiedEmbed = createYakuzaEmbed(
            'Já Verificado ✅',
            'Você já está verificado neste servidor!\n\n' +
            'Você tem acesso completo a todos os canais e funcionalidades.',
            colors.success
        );
        return interaction.reply({ embeds: [alreadyVerifiedEmbed], ephemeral: true });
    }
    
    // Lógica para iniciar a verificação para pessoas não verificadas
    const verificationStartEmbed = createYakuzaEmbed(
        'Verificação Iniciada 🔄',
        'Sua solicitação de verificação foi enviada!\n\n' +
        '**Próximos passos:**\n' +
        '• Um moderador irá entrar em contato com você em breve\n' +
        '• Aguarde a análise da sua solicitação\n' +
        '• Você será notificado quando for aprovado\n\n' +
        '*Obrigado pela paciência!*',
        colors.accent
    );
    
    await interaction.reply({ embeds: [verificationStartEmbed], ephemeral: true });
    
    // Notificar moderadores no canal de notificações
    const notifyChannel = interaction.guild.channels.cache.get(serverConfig.notifyChannel);
    if (notifyChannel) {
        const modNotificationEmbed = createYakuzaEmbed(
            'Nova Solicitação de Verificação 📋',
            `**Usuário:** ${member.user.tag} (${member.user.id})\n` +
            `**Menção:** <@${member.user.id}>\n` +
            `**Entrou no servidor:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n` +
            `**Conta criada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n\n` +
            `*Clique no nome do usuário para verificá-lo manualmente.*`,
            colors.primary
        );
        
        // Criar botões de aprovação e negação
        const approveButton = new ButtonBuilder()
            .setCustomId(`approve_verification_${member.user.id}`)
            .setLabel('✅ Aceitar')
            .setStyle(ButtonStyle.Success);
        
        const denyButton = new ButtonBuilder()
            .setCustomId(`deny_verification_${member.user.id}`)
            .setLabel('❌ Negar')
            .setStyle(ButtonStyle.Danger);
        
        const actionRow = new ActionRowBuilder()
            .addComponents(approveButton, denyButton);
        
        await notifyChannel.send({ 
            embeds: [modNotificationEmbed], 
            components: [actionRow] 
        });
    }
}

// Carregamento de comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.cjs'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Comandos com prefixo
    if (command.name) {
        client.commands.set(command.name, command);
        if (command.aliases) {
            command.aliases.forEach(alias => {
                client.commands.set(alias, command);
            });
        }
    }
    
    // Comandos slash
    if (command.slashData) {
        client.slashCommands.set(command.slashData.name, command);
    }
}

// Event: Bot pronto
client.once('ready', async () => {
    console.log(`${config.botName} está online!`);
    console.log(`Logado como: ${client.user.tag}`);
    console.log(`Servidores: ${client.guilds.cache.size}`);
    
    // Definir status
    client.user.setPresence({
        activities: [{
            name: `${config.prefix}help | Saya`,
            type: 0
        }],
        status: 'online'
    });
    
    // Registrar comandos slash
    await registerSlashCommands();
    
    // Iniciar sistema de monitoramento de status
    startStatusMonitoring();
});

// Listener para mudanças de presença (reativo)
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    try {
        if (!newPresence || !newPresence.guild) return;
        
        const serverConfig = getServerConfig(newPresence.guild.id);
        if (!serverConfig.statusChecker || !serverConfig.statusChecker.enabled || !serverConfig.statusChecker.monitoredUsers) {
            return;
        }
        
        const userId = newPresence.userId;
        const userData = serverConfig.statusChecker.monitoredUsers[userId];
        
        if (!userData) return; // Usuário não monitorado
        
        const member = await newPresence.guild.members.fetch(userId);
        let hasRequiredText = false;
        
        if (newPresence.activities) {
            for (const activity of newPresence.activities) {
                if (activity.type === 4 && activity.state && activity.state.includes(userData.requiredText)) {
                    hasRequiredText = true;
                    break;
                }
            }
        }
        
        // Se perdeu o texto obrigatório, remover cargo
        if (!hasRequiredText && member.roles.cache.has(userData.roleId)) {
            const role = newPresence.guild.roles.cache.get(userData.roleId);
            if (role) {
                await member.roles.remove(userData.roleId);
                
                // Notificar usuário
                try {
                    const user = await client.users.fetch(userId);
                    const dmEmbed = createYakuzaEmbed(
                        'Cargo Removido ❌',
                        `Seu cargo **${role.name}** foi removido do servidor **${newPresence.guild.name}** porque você removeu o texto obrigatório do seu status personalizado.\n\n` +
                        `**Texto obrigatório:** ${userData.requiredText}\n\n` +
                        'Adicione o texto novamente em seu status personalizado e clique em "Obter Cargo" para recuperar o cargo.',
                        colors.error
                    );
                    await user.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    console.log(`Não foi possível enviar DM para ${member.user.tag} sobre remoção de cargo`);
                }
                
                // Remover do monitoramento
                delete serverConfig.statusChecker.monitoredUsers[userId];
                const configs = loadConfigs();
                configs[newPresence.guild.id] = serverConfig;
                saveConfigs(configs);
                
                console.log(`Cargo ${role.name} removido de ${member.user.tag} por presença atualizada`);
            }
        }
        
    } catch (error) {
        console.error('Erro no listener de presença:', error);
    }
});

// Registrar comandos slash
async function registerSlashCommands() {
    try {
        const commands = [];
        
        client.slashCommands.forEach(command => {
            commands.push(command.slashData.toJSON());
        });
        
        const rest = new REST({ version: '9' }).setToken(config.token);
        
        console.log('Registrando comandos slash...');
        
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );
        
        console.log('Comandos slash registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos slash:', error);
    }
}

// Event: Mensagem (comandos com prefixo)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;
    
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    if (!command) return;
    
    try {
        await command.execute(message, args, client, config, colors, createYakuzaEmbed);
    } catch (error) {
        console.error(`Erro no comando ${commandName}:`, error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro',
            'Ocorreu um erro ao executar este comando.',
            colors.error
        );
        
        await message.reply({ embeds: [errorEmbed] });
    }
});

// Event: Interação (comandos slash e botões)
client.on('interactionCreate', async (interaction) => {
    // Comandos slash
    if (interaction.isCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;
        
        try {
            await command.executeSlash(interaction, client, config, colors, createYakuzaEmbed);
        } catch (error) {
            console.error(`Erro no comando slash ${interaction.commandName}:`, error);
            
            const errorEmbed = createYakuzaEmbed(
                'Erro',
                'Ocorreu um erro ao executar este comando.',
                colors.error
            );
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
    
    // Interações de modal
    if (interaction.isModalSubmit()) {
        try {
            // Tratar modals do painel
            if (interaction.customId.startsWith('embed_config_') || 
                interaction.customId.startsWith('status_config_')) {
                const painelCommand = client.slashCommands.get('painel');
                if (painelCommand && painelCommand.handleModalSubmit) {
                    await painelCommand.handleModalSubmit(interaction, client, config, colors, createYakuzaEmbed);
                    return;
                }
            }
            
            // Tratar submissão do modal de rejeição
            if (interaction.customId.startsWith('rejection_reason_modal_')) {
                const userId = interaction.customId.split('_')[3]; // Extrair userId do customId
                const rejectionReason = interaction.fields.getTextInputValue('rejection_reason');
                const targetUser = await client.users.fetch(userId);
                const serverConfig = getServerConfig(interaction.guild.id);
                
                if (!serverConfig) {
                    const notConfiguredEmbed = createYakuzaEmbed(
                        'Sistema Não Configurado',
                        'O sistema de verificação não está configurado neste servidor.',
                        colors.error
                    );
                    return interaction.reply({ embeds: [notConfiguredEmbed], ephemeral: true });
                }
                
                // Confirmar para o moderador que a rejeição foi processada
                const denyEmbed = createYakuzaEmbed(
                    'Verificação Negada ❌',
                    `A verificação de ${targetUser.tag} foi negada.\n\n**Motivo:** ${rejectionReason}`,
                    colors.error
                );
                
                await interaction.reply({ embeds: [denyEmbed], ephemeral: true });
                
                // Enviar DM para o usuário com o motivo personalizado
                try {
                    const userNotificationEmbed = createYakuzaEmbed(
                        'Verificação Negada ❌',
                        `Sua solicitação de verificação no servidor **${interaction.guild.name}** foi negada.\n\n` +
                        `**Motivo:** ${rejectionReason}\n\n` +
                        'Entre em contato com a equipe de moderação se você acredita que isso foi um erro.',
                        colors.error
                    );
                    await targetUser.send({ embeds: [userNotificationEmbed] });
                } catch (dmError) {
                    console.log(`Não foi possível enviar DM para ${targetUser.tag}`);
                    
                    // Informar o moderador que o DM não pôde ser enviado
                    const dmFailedEmbed = createYakuzaEmbed(
                        'DM Não Enviada',
                        `Não foi possível enviar mensagem privada para ${targetUser.tag}. O usuário pode ter as DMs desabilitadas.`,
                        colors.error
                    );
                    await interaction.followUp({ embeds: [dmFailedEmbed], ephemeral: true });
                }
                
                // Desabilitar os botões na mensagem original
                try {
                    // Buscar a mensagem original pelos logs ou pela mensagem recente no canal
                    const notifyChannel = interaction.guild.channels.cache.get(serverConfig.notifyChannel);
                    if (notifyChannel) {
                        const messages = await notifyChannel.messages.fetch({ limit: 50 });
                        const originalMessage = messages.find(msg => 
                            msg.embeds.length > 0 && 
                            msg.embeds[0].description && 
                            msg.embeds[0].description.includes(userId) &&
                            msg.components.length > 0
                        );
                        
                        if (originalMessage) {
                            // Criar botões desabilitados
                            const disabledApproveButton = new ButtonBuilder()
                                .setCustomId(`approve_verification_${userId}`)
                                .setLabel('✅ Aceitar')
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true);
                            
                            const disabledDenyButton = new ButtonBuilder()
                                .setCustomId(`deny_verification_${userId}`)
                                .setLabel('❌ Negar')
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true);
                            
                            const disabledActionRow = new ActionRowBuilder()
                                .addComponents(disabledApproveButton, disabledDenyButton);
                            
                            await originalMessage.edit({ 
                                embeds: originalMessage.embeds, 
                                components: [disabledActionRow] 
                            });
                        }
                    }
                } catch (editError) {
                    console.log('Erro ao desabilitar botões na mensagem original:', editError);
                }
                
                return;
            }
        } catch (error) {
            console.error('Erro ao processar modal submission:', error);
            
            const errorEmbed = createYakuzaEmbed(
                'Erro',
                'Ocorreu um erro ao processar a rejeição.',
                colors.error
            );
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
    
    // Interações de botões
    if (interaction.isButton()) {
        try {
            // Tratar botões do painel
            if (interaction.customId.startsWith('config_') || 
                interaction.customId.startsWith('status_') ||
                interaction.customId === 'obter_cargo') {
                const painelCommand = client.slashCommands.get('painel');
                if (painelCommand && painelCommand.handleButtonInteraction) {
                    await painelCommand.handleButtonInteraction(interaction, client, config, colors, createYakuzaEmbed);
                    return;
                }
            }
            
            // Tratamento especial para o botão de verificação
            if (interaction.customId === 'verification') {
                await handleVerificationButton(interaction, client, config, colors, createYakuzaEmbed);
                return;
            }
            
            // Tratar botões de verificação
            if (interaction.customId.startsWith('approve_verification_') || interaction.customId.startsWith('deny_verification_')) {
                const [action, verification, userId] = interaction.customId.split('_');
                const targetUser = await client.users.fetch(userId);
                const serverConfig = getServerConfig(interaction.guild.id);
                
                if (!serverConfig) {
                    const notConfiguredEmbed = createYakuzaEmbed(
                        'Sistema Não Configurado',
                        'O sistema de verificação não está configurado neste servidor.',
                        colors.error
                    );
                    return interaction.reply({ embeds: [notConfiguredEmbed], ephemeral: true });
                }
                
                if (action === 'approve') {
                    // Aprovar verificação
                    try {
                        // Usar fetch em vez de cache.get para garantir que o membro seja encontrado
                        const targetMember = await interaction.guild.members.fetch(userId);
                        
                        await targetMember.roles.add(serverConfig.verifiedRole);
                        
                        const approveEmbed = createYakuzaEmbed(
                            'Verificação Aprovada ✅',
                            `${targetUser.tag} foi aprovado e verificado com sucesso!`,
                            colors.success
                        );
                        
                        await interaction.reply({ embeds: [approveEmbed], ephemeral: true });
                        
                        // Notificar o usuário aprovado por DM
                        try {
                            const userNotificationEmbed = createYakuzaEmbed(
                                'Verificação Aprovada! ✅',
                                `Parabéns! Sua verificação no servidor **${interaction.guild.name}** foi aprovada.\n\n` +
                                'Agora você tem acesso completo a todos os canais e funcionalidades do servidor.',
                                colors.success
                            );
                            await targetUser.send({ embeds: [userNotificationEmbed] });
                        } catch (dmError) {
                            console.log(`Não foi possível enviar DM para ${targetUser.tag}`);
                        }
                        
                        // Desabilitar os botões na mensagem original após aprovação
                        try {
                            const notifyChannel = interaction.guild.channels.cache.get(serverConfig.notifyChannel);
                            if (notifyChannel) {
                                const messages = await notifyChannel.messages.fetch({ limit: 50 });
                                const originalMessage = messages.find(msg => 
                                    msg.embeds.length > 0 && 
                                    msg.embeds[0].description && 
                                    msg.embeds[0].description.includes(userId) &&
                                    msg.components.length > 0
                                );
                                
                                if (originalMessage) {
                                    // Criar botões desabilitados
                                    const disabledApproveButton = new ButtonBuilder()
                                        .setCustomId(`approve_verification_${userId}`)
                                        .setLabel('✅ Aceitar')
                                        .setStyle(ButtonStyle.Success)
                                        .setDisabled(true);
                                    
                                    const disabledDenyButton = new ButtonBuilder()
                                        .setCustomId(`deny_verification_${userId}`)
                                        .setLabel('❌ Negar')
                                        .setStyle(ButtonStyle.Danger)
                                        .setDisabled(true);
                                    
                                    const disabledActionRow = new ActionRowBuilder()
                                        .addComponents(disabledApproveButton, disabledDenyButton);
                                    
                                    await originalMessage.edit({ 
                                        embeds: originalMessage.embeds, 
                                        components: [disabledActionRow] 
                                    });
                                }
                            }
                        } catch (editError) {
                            console.log('Erro ao desabilitar botões na mensagem original:', editError);
                        }
                    } catch (error) {
                        console.error('Erro ao aprovar verificação:', error);
                        
                        // Verificar se o erro é devido ao membro não estar mais no servidor
                        if (error.code === 10007 || error.message.includes('Unknown Member')) {
                            const notFoundEmbed = createYakuzaEmbed(
                                'Usuário Não Encontrado',
                                'Este usuário não está mais no servidor ou saiu após solicitar a verificação.',
                                colors.error
                            );
                            await interaction.reply({ embeds: [notFoundEmbed], ephemeral: true });
                        } else {
                            const errorEmbed = createYakuzaEmbed(
                                'Erro ao Aprovar',
                                'Ocorreu um erro ao tentar aprovar a verificação. Tente novamente.',
                                colors.error
                            );
                            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        }
                    }
                } else if (action === 'deny') {
                    // Abrir modal para especificar motivo da rejeição
                    const modal = new ModalBuilder()
                        .setCustomId(`rejection_reason_modal_${userId}`)
                        .setTitle('Motivo da Rejeição');
                    
                    const reasonInput = new TextInputBuilder()
                        .setCustomId('rejection_reason')
                        .setLabel('Motivo da rejeição:')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Digite o motivo da rejeição da verificação...')
                        .setRequired(true)
                        .setMaxLength(1000);
                    
                    const actionRow = new ActionRowBuilder().addComponents(reasonInput);
                    modal.addComponents(actionRow);
                    
                    await interaction.showModal(modal);
                }
                return;
            }
            
            const [action, userId] = interaction.customId.split('_');
            const user = await client.users.fetch(userId);
            const member = interaction.guild.members.cache.get(userId);
            
            switch (action) {
                case 'avatar':
                    const avatarEmbed = createYakuzaEmbed(
                        `Avatar de ${user.username}`,
                        `[Clique aqui para baixar](${user.displayAvatarURL({ dynamic: true, size: 1024 })})`,
                        colors.accent
                    );
                    avatarEmbed.setImage(user.displayAvatarURL({ dynamic: true, size: 512 }));
                    await interaction.reply({ embeds: [avatarEmbed], ephemeral: true });
                    break;
                    
                case 'banner':
                    const fetchedUser = await client.users.fetch(userId, { force: true });
                    if (fetchedUser.banner) {
                        const bannerEmbed = createYakuzaEmbed(
                            `Banner de ${user.username}`,
                            `[Clique aqui para baixar](${fetchedUser.bannerURL({ dynamic: true, size: 1024 })})`,
                            colors.accent
                        );
                        bannerEmbed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 512 }));
                        await interaction.reply({ embeds: [bannerEmbed], ephemeral: true });
                    } else {
                        const noBannerEmbed = createYakuzaEmbed(
                            'Banner Não Encontrado',
                            `${user.username} não possui um banner personalizado.`,
                            colors.error
                        );
                        await interaction.reply({ embeds: [noBannerEmbed], ephemeral: true });
                    }
                    break;
                    
                case 'permissions':
                    if (member) {
                        const permissions = member.permissions.toArray();
                        const importantPerms = permissions.filter(perm => 
                            ['Administrator', 'ManageMessages', 'ManageRoles', 'ManageGuild', 'BanMembers', 'KickMembers', 'ManageChannels'].includes(perm)
                        );
                        
                        const permissionsEmbed = createYakuzaEmbed(
                            `Permissões de ${user.username}`,
                            null,
                            colors.accent
                        );
                        
                        if (importantPerms.length > 0) {
                            permissionsEmbed.addFields({
                                name: '**Permissões Importantes**',
                                value: importantPerms.map(perm => `${perm}`).join('\n'),
                                inline: false
                            });
                        } else {
                            permissionsEmbed.setDescription('Este usuário não possui permissões administrativas especiais.');
                        }
                        
                        await interaction.reply({ embeds: [permissionsEmbed], ephemeral: true });
                    } else {
                        const noMemberEmbed = createYakuzaEmbed(
                            'Usuário Não Encontrado',
                            'Este usuário não está no servidor.',
                            colors.error
                        );
                        await interaction.reply({ embeds: [noMemberEmbed], ephemeral: true });
                    }
                    break;
                    
                default:
                    const unknownEmbed = createYakuzaEmbed(
                        'Ação Desconhecida',
                        'Esta ação não foi reconhecida.',
                        colors.error
                    );
                    await interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('Erro ao processar interação de botão:', error);
            
            const errorEmbed = createYakuzaEmbed(
                'Erro',
                'Ocorreu um erro ao processar esta ação.',
                colors.error
            );
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

// Event: Erro
client.on('error', (error) => {
    console.error('Erro do Discord.js:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Erro não tratado:', error);
});

// Login do bot
client.login(config.token);