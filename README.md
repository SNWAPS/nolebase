
## 部署
### vercel 部署
vercel 部署很简单, 在 vercel 中选择项目后, 修改构建的 output directory 为 .vitepress/dist 就行了（默认是 ./dist）

如果你选择了用 vercel 部署，可以关闭 netflify 的 workflow. OK

在 github仓库页面 -> Actions -> netlify 对应 workflow -> 右上角3个点 -> disable workflow

<img width="204" alt="image" src="https://github.com/Jackiexiao/nolebase-template/assets/18050469/aa83c0f4-9ff6-4fc2-b5df-eb45f81f6773">

### 其他方式部署
其他部署方式见[原仓库](https://github.com/nolebase/nolebase/)的说明

## Obsidian 的设置
### 关于图片链接问题
如果你的 markdown 中的图片链接没有在当前文件所在目录下，会解析出错，无法在 vitepress 中正确渲染。如果没有这个问题，你可以跳过下面的内容

解决方法： 推荐的  Obsidian Setting => Files and links 设置如下
- New link format => Relative path to file
-  Use `[[Wikilinks]]` => False
- Default location for new attachments => In subfolder under current folder 
-  Subfolder name => assets

这么做有几个好处
- 保持兼容性的markdown: 可以让文档也能在 github 中被正确渲染（github无法解析`[[双链]]`）
- 方便迁移文件和图片，你只需要把图片文件夹和markdown文件一起复制就行（如果是全部汇总在某个文件夹下，以后复制比较麻烦）

额外的 tips
- 对于已有的笔记和图片链接，你可以考虑使用 obsidian 插件[obsidian-link-converter](https://github.com/ozntel/obsidian-link-converter) 来帮你做自动的转换 `[[wikilink]]` 为 relative_path 的 markdown link
- 同时，我建议使用这个 [clear-unused-image](https://github.com/ozntel/oz-clear-unused-images-obsidian) 插件来帮助你清除无用的图片（但记得不要运行 clear attachment ，否则 vitepress 相关代码会被移除）

## 开启 giscus 评论功能
giscus 利用了 [GitHub Discussions](https://docs.github.com/en/discussions) 实现的评论系统，让访客借助 GitHub 在你的网站上留下评论！（你的github仓库必须是公开的才能使用 giscus）

具体配置方法
- 第1步，访问 [Giscus](https://giscus.app/zh-CN) 网站， 参考网站上的说明，一步步操作，最后得到一个配置代码
- 第2步，在 `./vitepress/theme/index.ts` 中修改 giscus 相关配置，在该文件中搜索 `giscusTalk`, 参考说明，修改配置即可

## 其他替代方案
- obsidian 官方的 publish 
- https://github.com/oleeskild/obsidian-digital-garden
- https://github.com/ObsidianPublisher/obsidian-github-publisher
- https://github.com/alangrainger/share-note

