# CSP配置说明

## 什么是CSP

内容安全策略(Content Security Policy，简称CSP)是一种安全机制，用于防止跨站脚本攻击(XSS)和其他代码注入攻击。它通过指定哪些资源可以被加载和执行，来保护网站的安全。

## 配置文件说明

本项目使用`csp-config.json`文件来配置CSP策略。您可以直接编辑此文件来添加或移除允许的资源域名，无需修改代码。

### 配置文件结构

```json
{
  "additionalDomains": {
    "script": ["域名列表，用于JavaScript脚本"],
    "style": ["域名列表，用于CSS样式"],
    "font": ["域名列表，用于字体"],
    "image": ["域名列表，用于图片"],
    "connect": ["域名列表，用于网络连接"]
  },
  "dataTypes": {
    "font": ["数据类型列表，用于字体，如data:application/x-font-woff2"]
  },
  "development": {
    "enabled": true,  // 是否在开发环境启用CSP
    "strict": false   // 开发环境是否使用严格CSP
  }
}
```

## 如何修改配置

### 添加允许的域名

如果您需要添加一个新的允许的域名，只需在相应的数组中添加域名即可。例如，要允许从`https://example.com`加载脚本：

```json
{
  "additionalDomains": {
    "script": [
      "https://cdn.tailwindcss.com",
      "https://example.com"
    ],
    ...
  }
}
```

### 添加允许的数据类型

如果您需要添加一个新的允许的数据类型，只需在相应的数组中添加类型即可。例如，要允许加载base64编码的SVG图片：

```json
{
  "dataTypes": {
    "font": ["data:application/x-font-woff2"],
    "image": ["data:image/svg+xml"]
  }
}
```

### 开发环境配置

- `enabled`: 设置为`true`表示在开发环境中启用CSP，设置为`false`表示在开发环境中禁用CSP
- `strict`: 设置为`true`表示在开发环境中使用与生产环境相同的严格CSP策略，设置为`false`表示使用宽松的CSP策略

## 热重载功能

配置文件支持热重载，这意味着您可以修改配置文件，而无需重启服务器。修改保存后，新的CSP策略将立即生效。

## 常见问题

### 如何知道需要添加哪些域名？

当您的网站因为CSP限制而无法正常加载资源时，浏览器控制台会显示类似以下的错误信息：

```
Refused to load the script 'https://example.com/script.js' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' ..."
```

从这个错误信息中，您可以看到需要添加的域名是`https://example.com`，并且它应该被添加到`script`类型中。

### 资源类型对应关系

- `script`: JavaScript脚本文件 (.js)
- `style`: CSS样式文件 (.css)
- `font`: 字体文件 (.woff, .woff2, .ttf, .otf)
- `image`: 图片文件 (.jpg, .png, .gif, .svg)
- `connect`: AJAX请求、WebSocket连接等

## 示例

### 允许加载Google Fonts

```json
{
  "additionalDomains": {
    "style": ["https://fonts.googleapis.com"],
    "font": ["https://fonts.gstatic.com"]
  }
}
```

### 允许加载TailwindCSS

```json
{
  "additionalDomains": {
    "script": ["https://cdn.tailwindcss.com"],
    "style": ["https://cdn.tailwindcss.com"]
  }
}
```

### 允许加载阿里图标

```json
{
  "additionalDomains": {
    "font": ["https://at.alicdn.com", "http://at.alicdn.com"]
  }
}
``` 