export class ConverteHelper {
  // 将角色英文名转换为中文名的函数
  CharacterToZh(character: string): string {
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
      'wonkey': '芜猴',
      'lg_fanglingche': '[海洋传说]方灵澈',
      'lg_lilingyi': '[海洋传说]李令仪',
      'musha': '[精灵公主]穆莎',
    };
    return prefabTranslations[character] || character;
  }

  // 将平台代码转换为平台名称的函数
  PlatformToZh(platform: string): string {
    const platformTranslations = {
      //["Steam", "Rail", "PSN", "XBone", "Switch"]
      '1': 'Steam',
      '4': 'WeGame',
      '2': 'PlayStation',
      '19': 'XBone',
      '32': 'Switch',
    };
    return platformTranslations[platform] || platform;
  }

  // 将平台代码转换为平台名称的函数
  PlatformToNum(platform: string): string {
    const platformNumTranslations = {
      //["Steam", "Rail", "PSN", "XBone", "Switch"]
      'Steam': '1',
      'Rail': '4',
      'PSN': '2',
      'XBone': '19',
      'Switch': '32',
    };
    return platformNumTranslations[platform] || platform;
  }

  // 将季节英文转换为中文名的函数
  SeasonToZh(season: string): string {
    const seasonTranslations = {
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    };
    return seasonTranslations[season] || season;
  }

  // 将模式英文转换为中文名的函数
  ModeToZh(mode: string): string {
    const modeTranslations = {
      'endless': '无尽',
      'survival': '生存',
      'wilderness': '荒野',
      'relaxed': '放松',
      'oceanfishing': '海钓'
    };
    return modeTranslations[mode] || mode;
  }
}
