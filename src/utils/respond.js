const { ComponentType, MessageFlags } = require('discord.js');

function toEmbedData(source) {
  if (!source) return {};
  if (typeof source.toJSON === 'function') {
    return source.toJSON();
  }

  return source;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function createTextDisplay(content) {
  const text = normalizeText(content);
  if (!text) return null;

  return {
    type: ComponentType.TextDisplay,
    content: text,
  };
}

function createFieldDisplay(field) {
  if (!field?.name && !field?.value) {
    return null;
  }

  const label = normalizeText(field.name || 'Details');
  const value = normalizeText(field.value || 'No details provided.');

  return createTextDisplay(`### ${label}\n${value}`);
}

function createInlineFieldDisplay(fields) {
  const content = fields
    .map((field) => {
      const label = normalizeText(field.name || 'Details');
      const value = normalizeText(field.value || 'No details provided.');
      return `**${label}**\n${value}`;
    })
    .join('\n\n');

  return createTextDisplay(content);
}

function buildContainer(embedLike) {
  const embed = toEmbedData(embedLike);
  const components = [];
  const headerParts = [];

  if (embed.author?.name) {
    headerParts.push(`### ${embed.author.name}`);
  }

  if (embed.title) {
    headerParts.push(`# ${embed.title}`);
  }

  if (embed.description) {
    headerParts.push(embed.description);
  }

  const headerContent = headerParts.join('\n\n');
  const thumbnailUrl = embed.thumbnail?.url;

  if (headerContent && thumbnailUrl) {
    components.push({
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: headerContent,
        },
      ],
      accessory: {
        type: ComponentType.Thumbnail,
        media: {
          url: thumbnailUrl,
        },
      },
    });
  } else {
    const header = createTextDisplay(headerContent);
    if (header) {
      components.push(header);
    }
  }

  const fields = embed.fields || [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];

    if (field.inline) {
      const inlineGroup = [field];

      while (fields[index + 1]?.inline && inlineGroup.length < 2) {
        inlineGroup.push(fields[index + 1]);
        index += 1;
      }

      const inlineComponent = createInlineFieldDisplay(inlineGroup);
      if (inlineComponent) {
        components.push(inlineComponent);
      }

      continue;
    }

    const fieldComponent = createFieldDisplay(field);
    if (fieldComponent) {
      components.push(fieldComponent);
    }
  }

  if (embed.image?.url) {
    components.push({
      type: ComponentType.MediaGallery,
      items: [
        {
          media: {
            url: embed.image.url,
          },
        },
      ],
    });
  }

  const footerParts = [];
  if (embed.footer?.text) {
    footerParts.push(embed.footer.text);
  }

  const footer = createTextDisplay(footerParts.join('\n'));
  if (footer) {
    components.push(footer);
  }

  if (!components.length) {
    components.push(createTextDisplay('No details provided.'));
  }

  return {
    type: ComponentType.Container,
    components,
  };
}

function createCardMessage(embedLike, options = {}) {
  const flags = [MessageFlags.IsComponentsV2];

  if (options.ephemeral) {
    flags.push(MessageFlags.Ephemeral);
  }

  return {
    components: [buildContainer(embedLike), ...(options.components || [])],
    flags,
    ...(options.fetchReply ? { fetchReply: true } : {}),
  };
}

async function replyWithCard(target, embedLike, options = {}) {
  const payload = createCardMessage(embedLike, options);

  if (target.replied || target.deferred) {
    if (typeof target.followUp === 'function') {
      return target.followUp(payload);
    }
  }

  if (typeof target.reply === 'function') {
    return target.reply(payload);
  }

  if (typeof target.send === 'function') {
    return target.send(payload);
  }

  throw new Error('Target does not support replyWithCard.');
}

function createTextReply(content, options = {}) {
  const payload = {
    content,
  };

  if (options.ephemeral) {
    payload.flags = [MessageFlags.Ephemeral];
  }

  if (options.fetchReply) {
    payload.fetchReply = true;
  }

  return payload;
}

async function safeReply(target, payload) {
  if (target.replied || target.deferred) {
    if (typeof target.followUp === 'function') {
      return target.followUp(payload);
    }

    if (typeof target.editReply === 'function' && payload.content) {
      return target.editReply(payload);
    }
  }

  const basePayload = { ...payload };
  const isInteractionLike = typeof target.followUp === 'function' || typeof target.editReply === 'function';

  if (!isInteractionLike) {
    delete basePayload.flags;
  }

  if (typeof target.reply === 'function') {
    return target.reply(basePayload);
  }

  if (typeof target.send === 'function') {
    return target.send(basePayload);
  }

  throw new Error('Target does not support safeReply.');
}

async function replyNotice(target, content, options = {}) {
  return safeReply(target, createTextReply(content, options));
}

async function replyError(target, content, options = {}) {
  return replyNotice(target, content, { ephemeral: true, ...options });
}

module.exports = {
  createCardMessage,
  createTextReply,
  replyError,
  replyNotice,
  replyWithCard,
  safeReply,
};


