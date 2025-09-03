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
    name: '宝山居士',
    avatar: '123',
    username: 'SPAWNS',
    title: '大傻逼',
    desc: '开发者，专注于基础设施维护，数据分析，后端、DevOps 开发',
    links: [
      { type: 'github', icon: 'github', link: 'https://github.com/zgh2825902029' },
      { type: 'twitter', icon: 'twitter', link: '' },
      { type: 'email', icon: 'email', link: '1835939062@qq.com' },
    ],
    nameAliases: ['0', '1', '2', '3', '4'],
    emailAliases: ['1835939062@qq.com'],
  },
].map<Creator>((c) => {
  c.avatar = c.avatar || getAvatarUrl(c.username)
  return c as Creator
})

export const creatorNames = creators.map(c => c.name)
export const creatorUsernames = creators.map(c => c.username || '')
