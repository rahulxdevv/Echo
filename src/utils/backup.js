const { ChannelType } = require('discord.js');

async function createBackup(guild) {
  const backupData = {
    name: guild.name,
    iconURL: guild.iconURL(),
    verificationLevel: guild.verificationLevel,
    explicitContentFilter: guild.explicitContentFilter,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    afkTimeout: guild.afkTimeout,
    roles: [],
    channels: {
      categories: [],
      others: []
    }
  };

  // Roles
  guild.roles.cache
    .filter(r => !r.managed && r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .forEach(role => {
      backupData.roles.push({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable
      });
    });

  // Categories and Channels
  const categories = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  for (const [, category] of categories) {
    const catData = {
      name: category.name,
      permissions: category.permissionOverwrites.cache.map(p => ({
        id: p.id,
        type: p.type,
        allow: p.allow.bitfield.toString(),
        deny: p.deny.bitfield.toString()
      })),
      children: []
    };

    const children = guild.channels.cache
      .filter(c => c.parentId === category.id)
      .sort((a, b) => a.position - b.position);

    for (const [, child] of children) {
      catData.children.push({
        name: child.name,
        type: child.type,
        topic: child.topic,
        nsfw: child.nsfw,
        rateLimitPerUser: child.rateLimitPerUser,
        permissions: child.permissionOverwrites.cache.map(p => ({
          id: p.id,
          type: p.type,
          allow: p.allow.bitfield.toString(),
          deny: p.deny.bitfield.toString()
        }))
      });
    }
    backupData.channels.categories.push(catData);
  }

  // Channels without category
  guild.channels.cache
    .filter(c => !c.parentId && c.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position)
    .forEach(child => {
      backupData.channels.others.push({
        name: child.name,
        type: child.type,
        topic: child.topic,
        nsfw: child.nsfw,
        rateLimitPerUser: child.rateLimitPerUser,
        permissions: child.permissionOverwrites.cache.map(p => ({
          id: p.id,
          type: p.type,
          allow: p.allow.bitfield.toString(),
          deny: p.deny.bitfield.toString()
        }))
      });
    });

  return backupData;
}

async function loadBackup(guild, backupData) {
  // Clear existing channels
  const channels = await guild.channels.fetch();
  for (const [, channel] of channels) {
    await channel.delete().catch(() => {});
  }

  // Clear existing roles (except bot roles and everyone)
  const roles = await guild.roles.fetch();
  for (const [, role] of roles) {
    if (!role.managed && role.name !== '@everyone' && role.position < guild.members.me.roles.highest.position) {
      await role.delete().catch(() => {});
    }
  }

  // Create Roles
  const roleMap = new Map();
  for (const r of backupData.roles) {
    const role = await guild.roles.create({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      permissions: BigInt(r.permissions),
      mentionable: r.mentionable
    });
    roleMap.set(r.name, role.id);
  }

  // Create Categories and Children
  for (const cat of backupData.channels.categories) {
    const category = await guild.channels.create({
      name: cat.name,
      type: ChannelType.GuildCategory
    });

    for (const child of cat.children) {
      await guild.channels.create({
        name: child.name,
        type: child.type,
        topic: child.topic,
        nsfw: child.nsfw,
        rateLimitPerUser: child.rateLimitPerUser,
        parent: category.id
      });
    }
  }

  // Create Channels without category
  for (const child of backupData.channels.others) {
    await guild.channels.create({
      name: child.name,
      type: child.type,
      topic: child.topic,
      nsfw: child.nsfw,
      rateLimitPerUser: child.rateLimitPerUser
    });
  }

  // Guild Settings
  await guild.setName(backupData.name);
  // Note: Icon requires a buffer/url, usually avoided in basic clones to prevent errors
}

module.exports = { createBackup, loadBackup };
