import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "./en";

/**
 * The Privacy Policy in Simplified Chinese (ADR 44) — a translation of the
 * authoritative English text in `en.tsx`. It must promise exactly what the
 * English promises; the shell renders the translation notice separately.
 */
const updated = "2026年7月25日";

const sections: LegalSection[] = [
  {
    heading: "1. 简短版本",
    body: (
      <ul>
        <li>GLU 没有账号、没有数据库、也没有分析统计。服务器端不存在关于你的记录。</li>
        <li>你的专注历史——每次专注、时长、环境标签——存在你自己的浏览器里，从不上传。</li>
        <li>
          Todoist 是可选的。如果你连接它，你的令牌会加密存放在一个只有服务器能打开的 cookie 里，
          服务器不保留任何副本。
        </li>
        <li>没有广告 cookie，没有第三方追踪器，也不需要同意横幅。</li>
      </ul>
    ),
  },
  {
    heading: "2. 谁负责",
    body: (
      <p>
        GLU 是由 Ioan Biticu 运营的个人非商业项目，运行在 <code>ioan.dev/glu</code>。
        任何隐私相关的问题或请求，请发邮件到{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>。
      </p>
    ),
  },
  {
    heading: "3. 你的设备上存了什么",
    body: (
      <>
        <p>
          GLU 把它的状态保存在你浏览器的 <b>localStorage</b> 里，放在一个带版本号的键下面。
          它从不上传，而且也没有任何地方可以上传到。它包含：
        </p>
        <DataList
          items={[
            {
              term: "计时器状态",
              detail:
                "正在运行或已暂停的计时器、它的时长，以及你上次选择的预设——这样重新加载或合上盖子都不会丢掉你这一轮。",
            },
            {
              term: "专注历史",
              detail:
                "每一次完成的专注：什么时候结束、持续了多久、当时哪些环境标签是亮着的。包括当天，以及一份最多保留最近 90 天的存档。",
            },
            {
              term: "偏好设置",
              detail: "表盘设计、界面风格、配色方案，以及保持屏幕点亮的两个开关。",
            },
            {
              term: "Todoist 选择",
              detail:
                "如果你使用 Todoist：你选择的任务列表、你聚焦的任务，以及任何还等待发送的时间记录评论。",
            },
          ]}
        />
        <p>
          在浏览器里清除 <code>ioan.dev</code> 的站点数据会把这些全部删除，永久且彻底。
          应用里的“新的一天”会把可见的计数归入存档；存档本身上限为 90 天，并会自动丢掉最早的一天。
        </p>
      </>
    ),
  },
  {
    heading: "4. Cookie",
    body: (
      <>
        <p>
          GLU 不设置任何广告、分析或跨站 cookie。它可能设置的 cookie 只有严格必要的那些，
          而且只在你连接 Todoist 时才存在：
        </p>
        <DataList
          items={[
            {
              term: "glu_todoist",
              detail:
                "你加密（密封）后的 Todoist 令牌。httpOnly，所以页面脚本读不到它；在生产环境中带 Secure 和 SameSite=Lax；作用域限定在 /glu。退出登录时清除。",
            },
            {
              term: "glu_oauth_state",
              detail: "登录过程中使用的一个短时防伪造值，有效期十分钟，用完立即丢弃。",
            },
          ]}
        />
        <p>
          因为两者对你主动开启的功能都是严格必要的，所以没有同意横幅。
          一个为你刚刚点过的事情再问一次许可的横幅只是表演，它只会训练人们去关掉那些真正重要的横幅。
        </p>
        <p>你的配色方案偏好同样记在浏览器存储里。那是一项设置，不是追踪。</p>
      </>
    ),
  },
  {
    heading: "5. Todoist",
    body: (
      <>
        <p>连接 Todoist 完全是可选的；GLU 的其他一切没有它也能用。如果你确实连接了：</p>
        <ul>
          <li>
            你通过 Todoist 自己的 OAuth 页面授权 GLU。GLU 请求读写权限，
            因为它要显示你的任务，并且——只在你操作时——完成任务和添加时间评论。
          </li>
          <li>
            由此得到的令牌会被<b>密封（加密）进一个 httpOnly cookie</b>。
            浏览器持有一段它无法解密的不透明数据；服务器可以打开它，但什么都不存。
            这里没有令牌数据库，因为根本没有数据库。
          </li>
          <li>
            <b>所有 Todoist 流量都经过 GLU 自己的服务器</b>，所以你的令牌从不到达页面，
            你的浏览器也从不直接联系 Todoist。任务图片和文件附件也用同样的方式获取，
            这就是为什么你的浏览器同样从不与 Todoist 的 CDN 通信。
          </li>
        </ul>
        <p>
          GLU 会往你的账号里<b>写</b>的内容，而且只在你要求时才写：完成或取消完成一个任务，
          以及发布一条形如 <code>[25m] 你在这上面花了 25 分钟</code> 的时间记录评论。
          那句话是由服务器拼成的，不是由页面拼成的——GLU 无法向你的任务发布任意文本。
        </p>
        <p>
          你可以随时断开连接：<b>设置 → Todoist → 退出登录</b>会清除该 cookie，
          而在你的 Todoist 账号设置里撤销 GLU 会立即终止访问，且不依赖于我做任何事情。
        </p>
      </>
    ),
  },
  {
    heading: "6. 服务器看到什么",
    body: (
      <>
        <p>
          服务器是一个无状态代理。它没有数据库、没有会话存储、也没有用户记录。
          它只看到任何一台 Web 服务器在处理请求时都会看到的东西：
        </p>
        <ul>
          <li>
            <b>速率限制计数器。</b>为了让一台小容器保持可用，请求会按客户端计数。
            计数键由你的 IP 地址推导而来（IPv6 按网络前缀分组，从不使用单个地址），
            <b>只保存在内存里</b>，从不写入磁盘，进程重启后完全丢失。
            被拒绝请求的日志行有意不包含任何地址。
          </li>
          <li>
            <b>普通的运行日志</b>——维持站点运行所需的错误和诊断信息。
            没有分析管道，没有事件追踪，也没有画像。
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "7. 第三方",
    body: (
      <>
        <ul>
          <li>
            <b>Todoist</b>——只有在你连接它时。你对 Todoist 的使用受
            <LegalLink href="https://todoist.com/privacy">他们的隐私政策</LegalLink>约束。
          </li>
          <li>
            <b>托管基础设施</b>——站点所运行的服务器，它们代表我处理请求。
          </li>
        </ul>
        <p>
          这就是全部清单。GLU 不从任何其他人的服务器加载字体、脚本或图片：
          它的内容安全策略只允许它自己的源，所以即使有人不小心加了一个第三方追踪器，它也运行不起来。
        </p>
      </>
    ),
  },
  {
    heading: "8. 应用请求的权限",
    body: (
      <>
        <p>
          下面每一项都是浏览器权限，完全在你的设备上处理。它们的任何情况都不会被上报到别处，
          而拒绝其中任何一项，计时器仍然完全可用。
        </p>
        <DataList
          items={[
            {
              term: "通知",
              detail:
                "让一次结束的专注能在 GLU 处于后台标签页时找到你。在你第一次按开始时询问一次；拒绝会被你的浏览器记住，之后不再询问。",
            },
            {
              term: "屏幕保持点亮",
              detail: "让平板不会在专注中途睡着。由设置 → 屏幕里的两个开关控制。",
            },
            {
              term: "声音",
              detail:
                "每一个结束提示音都是在浏览器里生成的。不下载任何音频文件，也不录制任何东西——GLU 从不请求麦克风或摄像头权限。",
            },
          ]}
        />
      </>
    ),
  },
  {
    heading: "9. 保留期限",
    body: (
      <p>
        在你的设备上：你保留多久就是多久——专注存档自我限制在 90 天，而清除站点数据会一次性删掉全部。
        在服务器上：什么都不保留，因为什么都没存。Todoist 的 cookie 一直留在你的浏览器里，
        直到你退出登录或它过期；速率限制计数器在重启时消失；运行日志出于安全和排错目的短暂保留。
      </p>
    ),
  },
  {
    heading: "10. 你的权利",
    body: (
      <p>
        取决于你居住的地方，你可能有权访问、更正、导出或删除关于你的个人数据，并反对对其进行处理。
        GLU 的构建方式使得几乎没有什么可供你行使这些权利的对象：没有账号，没有服务器端的用户画像，
        只有一份只有你能读的本地历史。如果你认为有什么是我确实持有的，请发邮件到{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>，我会处理。
      </p>
    ),
  },
  {
    heading: "11. 儿童",
    body: (
      <p>GLU 不面向儿童，我也不会在知情的情况下收集 16 岁以下任何人的数据。</p>
    ),
  },
  {
    heading: "12. 变更",
    body: (
      <p>
        如果 GLU 今后开始以不同的方式处理数据，本页会随之改变，上方的“最后更新”日期也会更新。
        这个项目是开源的，所以变更除了在这里可见，在它的历史记录里也看得到。
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated,
  title: "隐私政策",
  intro: (
    <>
      GLU 是一个把你的数据留在你自己设备上的番茄钟和专注记录工具。
      本页说明它究竟处理什么、这些数据去了哪里，以及它绝不会做什么。
      它与<LegalLink href="/terms">服务条款</LegalLink>一并适用。
    </>
  ),
  sections,
};

export default content;
