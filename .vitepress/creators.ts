export interface SocialEntry {
  type: 'github' | 'twitter' | 'email'
  icon: string
  link: string
}

export interface Creator {
  avatar: string
  name: string
  username?: string
  title?: string
  org?: string
  desc?: string
  links?: SocialEntry[]
  nameAliases?: string[]
  emailAliases?: string[]
}

const getAvatarUrl = (name: string) => `https://github.com/${name}.png`

export const creators: Creator[] = [
  {
    name: 'SPAWNS',
    avatar: '',
    username: 'SNWAPS',
    title: '宝山双红花棍 东海大街扛把子',
    desc: '和你猜的不太一样',
    links: [
      { type: 'github', icon: 'github', link: 'https://github.com/SNWAPS' },
    ],
    nameAliases: ['SNWAPS', 'SPAWNS', '睡不醒', '宝山居士'],
    emailAliases: ['1835939062@qq.com'],
  },
  {
    name: '影分身',
    avatar: '',
    username: 'nano',
    title: '一个人的时间精力毕竟是有限的',
    desc: '',
    links: [
      { type: 'github', icon: 'github', link: 'https://github.com/SNWAPS' },
    ],
    nameAliases: ['影分身'],
    emailAliases: [''],
  },
].map<Creator>((c) => {
  c.avatar = c.avatar || getAvatarUrl(c.username)
  return c as Creator
})

export const creatorNames = creators.map(c => c.name)
export const creatorUsernames = creators.map(c => c.username || '')
