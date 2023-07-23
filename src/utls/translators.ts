// 将角色英文名转换为中文名的函数
export function characterToZh(character: string): string {
  const prefabTranslations = {
    'wilson': '威尔逊',
    'willow': '薇洛',
    'wolfgang': '沃尔夫冈',
    'wendy': '温蒂',
    'wickerbottom': '薇克巴顿',
    'woodie': '伍迪',
    'wes': '韦斯',
    'waxwell': '麦斯威尔',
    'wathgrithr': '薇格弗德',
    'webber': '韦伯',
    'winona': '薇诺娜',
    'warly': '沃利',
    'walter': '沃尔特',
    'wortox': '沃拓克斯',
    'wormwood': '沃姆伍德',
    'wurt': '沃特',
    'wanda': '旺达',
    'wonkey': '芜猴'
  };
  return prefabTranslations[character] || character;
}

// 将平台代码转换为平台名称的函数
export function platformToZh(platform: string): string {
  const platformTranslations = {
    '1': 'Steam',
    '2': 'Klei',
    '3': 'Xbox',
    '4': 'PlayStation',
    '5': 'iOS',
    '6': 'Android',
    '7': 'Nintendo Switch',
    '8': 'Tencent WeGame',
    '9': 'Discord',
    '10': 'GOG',
    '11': 'Microsoft Store',
    '12': 'Epic Games',
    '13': 'Mac App Store',
    '14': 'Google Play',
    '15': 'Amazon Appstore'
  };
  return platformTranslations[platform] || platform;
}

// 将季节英文转换为中文名的函数
export function seasonToZh(season: string): string {
  const seasonTranslations = {
    'spring': '春',
    'summer': '夏',
    'autumn': '秋',
    'winter': '冬'
  };
  return seasonTranslations[season] || season;
}

// 将模式英文转换为中文名的函数
export function modeToZh(mode: string): string {
  const modeTranslations = {
    'endless': '无尽',
    'survival': '生存',
    'wilderness': '荒野'
  };
  return modeTranslations[mode] || mode;
}