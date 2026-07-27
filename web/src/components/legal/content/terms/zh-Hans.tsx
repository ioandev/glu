import { LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "../privacy/en";

/**
 * The Terms of Service in Simplified Chinese (ADR 44) — a translation of the
 * authoritative English text in `en.tsx`. The shell renders the translation
 * notice separately.
 */
const updated = "2026年7月25日";

const sections: LegalSection[] = [
  {
    heading: "1. 谁在运营 GLU",
    body: (
      <p>
        GLU（下称“本服务”）是由 Ioan Biticu（下称“我”）在 <code>ioan.dev/glu</code>{" "}
        运营的个人非商业项目。它是一个以平板为先的番茄钟和专注记录工具，免费提供，并且公开开发。
        你可以通过{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink> 联系我。
      </p>
    ),
  },
  {
    heading: "2. 接受条款",
    body: (
      <p>
        使用 GLU 即表示你同意本条款。如果你不同意，请不要使用本服务。
        本条款与<LegalLink href="/privacy">隐私政策</LegalLink>一并适用，
        后者说明了哪些数据被处理以及它们存放在哪里。
      </p>
    ),
  },
  {
    heading: "3. 本服务是什么",
    body: (
      <>
        <p>
          一个计时器、一份你完成的专注记录，以及一项可选的 Todoist 集成：
          它显示你的任务、让你完成它们，并在你于某个聚焦的任务上完成一轮专注时添加一条时间记录评论。
        </p>
        <p>
          它是一件个人器具，不是一个带客服台的产品。功能可能变化，本服务也可能随时中断或停止，恕不另行通知。
        </p>
      </>
    ),
  },
  {
    heading: "4. 你的数据在你的设备上",
    body: (
      <>
        <p>
          你的专注历史存在你浏览器的 localStorage 里——没有账号，没有服务器端副本，也没有备份。
          这是一个刻意的设计选择，它带来的后果你应当当作一项条款来读，而不是一条脚注：
        </p>
        <ul>
          <li>
            清除浏览器的站点数据、使用隐私浏览，或者更换设备或浏览器，都意味着历史记录消失或不存在。
            无论是我还是任何人都无法恢复它。
          </li>
          <li>存档最多保留最近 90 天；更早的日期会被自动丢弃。</li>
        </ul>
        <p>
          <b>不要把 GLU 当作记录系统</b>来依赖，无论是计费工时还是其他事后才重要的事情。
        </p>
      </>
    ),
  },
  {
    heading: "5. 你的 Todoist 账号",
    body: (
      <>
        <p>
          如果你连接 Todoist，GLU 是按你的指示、在你的授权下行事的。
          你对你连接的账号负责，也要自行审视 GLU 对它做了什么——具体来说：
          完成或取消完成你点击的任务，以及在一次聚焦的专注结束时发布一条时间记录评论。
        </p>
        <p>
          只连接你自己控制的账号。你可以随时撤销访问权限，在设置 → Todoist → 退出登录，
          或者在 Todoist 自己的账号设置里。Todoist 是一项独立服务，受
          <LegalLink href="https://todoist.com/terms">它自己的条款</LegalLink>约束；
          我不对它、它的可用性或它 API 的变化负责。
        </p>
      </>
    ),
  },
  {
    heading: "6. 可接受的使用",
    body: (
      <>
        <p>你同意不会：</p>
        <ul>
          <li>
            对本服务进行洪水式请求、抓取或自动化操作，或者绕过它施加的请求限制——
            这些限制的存在是为了让一台小服务器对所有使用它的人保持可用；
          </li>
          <li>探测、扫描或试图绕过它的安全措施，或试图访问属于他人的数据；</li>
          <li>连接你并不控制的 Todoist 账号，或利用本服务干扰他人的账号；</li>
          <li>将本服务用于任何违法用途。</li>
        </ul>
        <p>超出限制的请求会被自动拒绝，滥用性的流量可能在不另行通知的情况下被封锁。</p>
      </>
    ),
  },
  {
    heading: "7. 可用性",
    body: (
      <p>
        GLU 运行在规模不大的个人基础设施上。没有可用性承诺，没有服务等级，
        也不保证进行中的一轮专注能挺过一次重启或一次部署——尽管你的计时器状态存在本地，通常是能挺过去的。
      </p>
    ),
  },
  {
    heading: "8. 知识产权与许可",
    body: (
      <p>
        GLU 的源代码以 Apache License 2.0 发布在{" "}
        <LegalLink href="https://github.com/ioandev/glu">GitHub</LegalLink> 上，
        它所依赖的第三方组件的许可证列在仓库中。那些许可条款约束的是<i>代码</i>；
        本条款约束的是你对<i>托管服务</i>的使用。GLU 这个名称、它的文字内容和它的设计属于我；
        Todoist 的名称和标志属于 Doist，在此仅用于标识该集成。
      </p>
    ),
  },
  {
    heading: "9. 不提供担保",
    body: (
      <p>
        本服务按“现状”和“现有可用”提供，不附带任何形式的明示或默示担保，包括对特定用途适用性的担保。
        我不保证它准确、不间断、及时或无错误——包括不保证专注结束提醒会准时到达，
        这取决于你的浏览器和操作系统。
      </p>
    ),
  },
  {
    heading: "10. 责任限制",
    body: (
      <p>
        在法律允许的最大范围内，对于因你使用本服务而产生的任何间接、附带或后果性损失，
        以及丢失的专注历史、错过的提醒，或通过本服务对你 Todoist 账号所做的更改，我均不承担责任。
        本条款中的任何内容都不排除依法不得排除的责任。
      </p>
    ),
  },
  {
    heading: "11. 本条款的变更",
    body: (
      <p>
        本条款可能变更；上方的“最后更新”日期反映当前版本，变更后继续使用即表示你接受该变更。
      </p>
    ),
  },
  {
    heading: "12. 适用法律",
    body: (
      <p>
        本条款受英格兰和威尔士法律管辖。本条款中的任何内容都不限制你所在地强制性消费者或数据保护法律赋予你的权利。
      </p>
    ),
  },
  {
    heading: "13. 联系方式",
    body: (
      <p>
        对本条款有疑问？请发邮件到{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>。
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated,
  title: "服务条款",
  intro: (
    <>
      GLU 是一个免费的个人专注计时器，按现状提供。你的数据留在你的设备上，
      你的 Todoist 账号仍然属于你。数据方面的内容见
      <LegalLink href="/privacy">隐私政策</LegalLink>。
    </>
  ),
  sections,
};

export default content;
