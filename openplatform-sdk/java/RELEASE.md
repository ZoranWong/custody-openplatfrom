# Java SDK 发布指南（Maven Central）

发布地址：<https://central.sonatype.com/artifact/com.cregis/cregis-sdk-core>

仓库已配置好发布流程：`pom.xml` 的 `release` profile 会签名并调用 **Central Portal publishing plugin**，把 bundle 上传到 `central.sonatype.com`。

---

## 一、一次性准备

### 1. 生成 GPG 签名密钥

Maven Central 要求所有构件都用 GPG 签名。

```bash
gpg --full-generate-key
#   类型: RSA and RSA
#   长度: 4096
#   有效期: 0（永不过期，或按公司规范）
```

上传公钥到 keyserver：

```bash
gpg --keyserver keyserver.ubuntu.com --send-keys <KEY_ID>
```

查看 KEY_ID：

```bash
gpg --list-secret-keys --keyid-format LONG
# sec   rsa4096/<KEY_ID> 2026-xx-xx
```

### 2. 申请 Central Portal Token

1. 登录 <https://central.sonatype.com/>
2. 右上角账号 → **View Account** → **Generate User Token**
3. 得到一对用户名/密码（**Token 不是登录密码**）

### 3. 写入 `~/.m2/settings.xml`

```xml
<settings>
  <servers>
    <server>
      <id>central</id>
      <username>你的 Token 用户名</username>
      <password>你的 Token 密码</password>
    </server>
  </servers>
</settings>
```

`<id>central</id>` 必须与 `pom.xml` 中 `<publishingServerId>central</publishingServerId>` 一致。

### 4. 命名空间

`com.cregis` 已在 Central 验证过（1.0.0 已发布），无需重复验证。

---

## 二、本地一键发布

```bash
cd openplatform-sdk/java

./release.sh 1.2.0            # 上传，停在 Validated；到网站点 Publish
./release.sh 1.2.0 --auto     # 上传并自动发布
./release.sh --dry-run 1.2.0  # 只构建+测试，不上传
```

脚本会依次：

1. 校验版本号格式，并同步 `pom.xml` 版本
2. 自动定位 JDK（本机可使用 VS Code Java 插件自带 JDK）
3. 查询 Central，**版本已存在则直接终止**（Central 不允许覆盖同一版本）
4. 检查 `openplatform-sdk/java` 是否有未提交改动
5. 检查 GPG 私钥与 Central 凭据
6. 执行 `mvn -Prelease clean verify`（含单元测试 + 签名）
7. 执行 `mvn -Prelease deploy` 上传 bundle
8. 创建本地 tag `java-sdk-v<version>`

> 首次发布前建议先跑 `./release.sh --dry-run 1.2.0`。

---

## 三、GitHub Actions 自动发布

工作流：`.github/workflows/release-java-sdk.yml`（手动触发）

### 1. 配置仓库 Secrets

在 GitHub 仓库 → **Settings → Secrets and variables → Actions** 新增：

| Secret | 内容 |
|--------|------|
| `MAVEN_CENTRAL_USERNAME` | Central Portal Token 用户名 |
| `MAVEN_GPG_PRIVATE_KEY` | GPG 私钥的 **ASCII armor** 文本（见下） |
| `MAVEN_GPG_PASSPHRASE` | 生成密钥时设置的密码；未设置密码则填任意占位值并在工作流外处理 |

导出私钥：

```bash
gpg --armor --export-secret-keys <KEY_ID>
# 从 "-----BEGIN PGP PRIVATE KEY BLOCK-----" 开始整段复制
```

### 2. 触发

GitHub → **Actions** → **Release Java SDK** → **Run workflow** → 输入版本号（如 `1.2.0`）。

工作流会：

1. 用 `versions:set` 同步版本
2. 导入 GPG 私钥
3. `mvn -Prelease clean deploy`
4. 提交版本变更并打 tag
5. 上传完成后到 <https://central.sonatype.com/publishing/deployments> 点 **Publish**

---

## 四、发布后

- 约 10–30 分钟后同步到 Maven Central。
- 使用方引入：

```xml
<dependency>
    <groupId>com.cregis</groupId>
    <artifactId>cregis-sdk-core</artifactId>
    <version>1.2.0</version>
</dependency>
```

- 页面：<https://central.sonatype.com/artifact/com.cregis/cregis-sdk-core/1.2.0>

---

## 常见问题

| 现象 | 原因 / 处理 |
|------|-------------|
| `401 Unauthorized` | `settings.xml` 中 server id 不是 `central`，或 Token 未正确填写 |
| `Invalid signature` | GPG 公钥未上传到 keyserver，或密码错误 |
| `Version already exists` | 该版本已发布，Central 不允许覆盖；提升版本号 |
| `Namespace not verified` | `com.cregis` 需在 Central 完成域名验证（当前已完成） |
| 部署卡在 `Validating` | 去 portal 查看失败原因，常见为缺少 sources/javadoc jar（pom 已配置）或 POM 缺少 license/developer/scm 信息 |
