// src/utils/emoji.js
export const WECHAT_EMOJI_MAP = {
  // 表情类
  '[微笑]': '😊', '[撇嘴]': '😒', '[色]': '😍', '[发呆]': '😳', '[得意]': '😎',
  '[流泪]': '😢', '[害羞]': '😊', '[闭嘴]': '🤐', '[睡]': '😴', '[大哭]': '😭',
  '[尴尬]': '😅', '[发怒]': '😠', '[调皮]': '😜', '[呲牙]': '😁', '[惊讶]': '😱',
  '[难过]': '😞', '[酷]': '😎', '[冷汗]': '😓', '[抓狂]': '😤', '[吐]': '🤮',
  '[偷笑]': '😏', '[可爱]': '🥰', '[白眼]': '🙄', '[傲慢]': '😤', '[饥饿]': '🤤',
  '[困]': '😪', '[惊恐]': '😨', '[流汗]': '😅', '[憨笑]': '😄',
  
  // 手势类
  '[握手]': '🤝', '[强]': '💪', '[弱]': '👎', '[拳头]': '👊', '[胜利]': '✌️',
  '[OK]': '👌', '[赞]': '👍', '[踩]': '👎', '[爱心]': '❤️', '[心碎]': '💔',
  
  // 数字和符号
  '[666]': '🔥', '[萌]': '🥰',
  
  // 物品类
  '[咖啡]': '☕', '[蛋糕]': '🎂', '[礼物]': '🎁', '[玫瑰]': '🌹', '[凋谢]': '🥀'
};

export const EMOJI_CATEGORIES = {
  '常用': ['😊', '😂', '👍', '❤️', '😍', '🤔', '😢', '👌', '🔥', '💪', '🙏', '😎'],
  '表情': ['😊', '😂', '🥰', '😍', '😎', '😢', '😠', '😱', '🤔', '😴', '🤐', '😋'],
  '手势': ['👍', '👎', '👌', '✌️', '🤝', '👋', '💪', '🙏', '👏', '🤞', '✊', '👊'],
  '爱心': ['❤️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💔', '🧡', '💛'],
  '物品': ['🎁', '🌹', '☕', '🎂', '⚽', '🎮', '📱', '💻', '🎵', '🌟', '🔥', '✨']
};

/**
 * 将微信表情文本转换为emoji
 */
export const convertWechatToEmoji = (text) => {
  if (!text) return text;
  
  let convertedText = text;
  Object.entries(WECHAT_EMOJI_MAP).forEach(([wechatText, emoji]) => {
    const regex = new RegExp(wechatText.replace(/[[\]]/g, '\\$&'), 'g');
    convertedText = convertedText.replace(regex, emoji);
  });
  
  return convertedText;
};

/**
 * 将emoji转换为微信表情文本（可选）
 */
export const convertEmojiToWechat = (text) => {
  if (!text) return text;
  
  let convertedText = text;
  Object.entries(WECHAT_EMOJI_MAP).forEach(([wechatText, emoji]) => {
    const regex = new RegExp(emoji, 'g');
    convertedText = convertedText.replace(regex, wechatText);
  });
  
  return convertedText;
};