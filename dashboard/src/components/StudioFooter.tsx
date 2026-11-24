import { useEffect, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileText,
  Github,
  Heart,
  Info,
  KeyRound,
  Lock,
  Rocket,
  Scale,
  Server,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';

export type StudioInfoModalId = 'about' | 'api' | 'terms';

const GITHUB_URL = 'https://github.com/ZOF478/zofstudio';
const SITE_URL = 'https://studio.zoedit.com';
const ZOFEDIT_URL = 'https://zoedit.com';
const REMOTION_LICENSE_URL = 'https://www.remotion.dev/license';

interface StudioFooterProps {
  onOpenModal: (modal: StudioInfoModalId) => void;
}

function ReactLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-11.5 -10.23174 23 20.46348"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
      <g stroke="#61DAFB" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

const REMOTION_MARK_PATH =
  'M148.332 92.9015C143.307 93.1742 139.259 93.9713 135.179 95.5236C133.144 96.2893 129.809 97.957 127.973 99.1108C120.295 103.925 114.443 111.162 111.391 119.584C110.782 121.252 109.136 126.57 108.076 130.23C101.018 154.7 97.0112 181.456 96.1511 209.776C96.0148 214.286 96.0148 225.026 96.1511 229.463C96.728 248.237 98.5216 265.187 101.773 282.472C103.095 289.468 105.213 298.866 106.44 303.135C108.947 311.809 114.065 319.193 121.344 324.605C126.221 328.234 131.759 330.668 137.895 331.863C140.853 332.44 144.755 332.702 147.629 332.514C151.604 332.251 159.491 331.192 165.9 330.049C194.786 324.899 221.469 315.679 245.666 302.485C260.99 294.125 274.09 285.074 286.729 274.092C299.326 263.163 310.066 251.405 319.516 238.21C321.708 235.158 322.81 233.375 323.911 231.131C326.743 225.341 328.075 219.583 328.064 213.143C328.064 207.143 326.932 201.815 324.488 196.361C323.313 193.728 322.191 191.84 319.674 188.253C310.402 175.048 300.112 163.542 287.568 152.361C268.122 135.034 245.026 120.822 219.235 110.302C213.644 108.026 208.138 106.022 201.509 103.851C187.475 99.2681 170.106 95.2929 155.411 93.3105C153.104 92.9959 149.968 92.8176 148.332 92.9015Z';

function RemotionLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 250 250"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g transform="translate(132 126) scale(1) translate(-132 -126)">
        <g transform="scale(0.688705) translate(-20 -30)">
          <path d={REMOTION_MARK_PATH} fill="#0B84F3" opacity="0.25" />
        </g>
      </g>
      <g transform="translate(132 126) scale(0.68) translate(-132 -126)">
        <g transform="scale(0.688705) translate(-20 -30)">
          <path d={REMOTION_MARK_PATH} fill="#0B84F3" opacity="0.5" />
        </g>
      </g>
      <g transform="translate(132 126) scale(0.36) translate(-132 -126)">
        <g transform="scale(0.688705) translate(-20 -30)">
          <path d={REMOTION_MARK_PATH} fill="#0B84F3" />
        </g>
      </g>
    </svg>
  );
}

function OpenCodeLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="currentColor"
      fillRule="evenodd"
    >
      <path d="M16 8H8v8h8V8zM4 4v16h16V4H4z" />
    </svg>
  );
}

function ElevenLabsLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="currentColor"
    >
      <path d="M5 2h4.8v20H5V2zm9.2 0H19v20h-4.8V2z" />
    </svg>
  );
}

const CREDITS = [
  {
    name: 'React',
    href: 'https://react.dev',
    noteAr: 'الواجهة التفاعلية',
    noteEn: 'interactive UI',
    Logo: ReactLogo,
  },
  {
    name: 'Remotion',
    href: 'https://www.remotion.dev',
    noteAr: 'تصيير فيديو برمجي',
    noteEn: 'programmatic video rendering',
    Logo: RemotionLogo,
  },
  {
    name: 'OpenCode',
    href: 'https://opencode.ai',
    noteAr: 'وكيل برمجة المشاهد',
    noteEn: 'autonomous scene-coding agent',
    Logo: OpenCodeLogo,
  },
  {
    name: 'ElevenLabs',
    href: 'https://elevenlabs.io',
    noteAr: 'التعليق الصوتي وتصميم الصوت',
    noteEn: 'voiceover & sound design',
    Logo: ElevenLabsLogo,
  },
];

export function StudioFooter({ onOpenModal }: StudioFooterProps) {
  const { t } = useI18n();

  return (
    <footer className="mt-6 border-t border-white/8 bg-[#080B11]/95">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-3 py-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-slate-400">
            <Heart className="h-3 w-3 shrink-0 text-rose-300" />
            <span>{t('بُني بعناية على', 'Built with care on')}</span>
            {CREDITS.map((credit, index) => (
              <span key={credit.name} className="inline-flex items-center gap-1.5">
                {index > 0 ? <span className="text-slate-600">·</span> : null}
                <a
                  href={credit.href}
                  target="_blank"
                  rel="noreferrer"
                  title={t(credit.noteAr, credit.noteEn)}
                  className="inline-flex items-center gap-1 font-semibold text-slate-200 underline-offset-2 transition-colors hover:text-sky-300 hover:underline"
                >
                  {credit.Logo ? <credit.Logo className="h-3 w-3 shrink-0" /> : null}
                  {credit.name}
                </a>
                <span className="hidden text-slate-500 sm:inline">
                  ({t(credit.noteAr, credit.noteEn)})
                </span>
              </span>
            ))}
          </p>
          <p className="text-[10px] text-slate-500">
            © {new Date().getFullYear()} Zof Studio ·{' '}
            {t('مفتوح المصدر بترخيص MIT', 'Open source under the MIT license')}
          </p>
        </div>

        <nav
          aria-label={t('روابط الاستوديو والمعلومات', 'Studio links and information')}
          className="flex flex-wrap items-center gap-1.5"
        >
          <FooterButton icon={<Info className="h-3.5 w-3.5" />} onClick={() => onOpenModal('about')}>
            {t('حول الأداة وهندستها', 'About & architecture')}
          </FooterButton>
          <FooterButton icon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => onOpenModal('api')}>
            {t('دليل تفعيل المفاتيح والنماذج', 'API setup guide')}
          </FooterButton>
          <FooterButton icon={<Scale className="h-3.5 w-3.5" />} onClick={() => onOpenModal('terms')}>
            {t('شروط الاستخدام والتراخيص', 'Terms & licensing')}
          </FooterButton>
          <FooterLink href={GITHUB_URL} icon={<Github className="h-3.5 w-3.5" />}>
            GitHub
          </FooterLink>
          <FooterLink href={SITE_URL} icon={<ExternalLink className="h-3.5 w-3.5" />}>
            studio.zoedit.com
          </FooterLink>
        </nav>
      </div>
    </footer>
  );
}

function FooterButton({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0E121A] px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-slate-100 cursor-pointer"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function FooterLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0E121A] px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-slate-100"
    >
      {icon}
      <span>{children}</span>
      <ArrowUpRight className="h-2.5 w-2.5 text-slate-500" />
    </a>
  );
}

interface StudioInfoModalProps {
  modal: StudioInfoModalId | null;
  onClose: () => void;
}

export function StudioInfoModal({ modal, onClose }: StudioInfoModalProps) {
  const { t, dir } = useI18n();

  useEffect(() => {
    if (!modal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modal, onClose]);

  if (!modal) return null;

  const titles: Record<StudioInfoModalId, string> = {
    about: t('حول الأداة وهندستها', 'About & architecture'),
    api: t('دليل تفعيل المفاتيح والنماذج', 'API setup guide'),
    terms: t('شروط الاستخدام والتراخيص', 'Terms & licensing'),
  };
  const subtitles: Record<StudioInfoModalId, string> = {
    about: t(
      'كيف بُني Zof Studio، ولماذا يقدّم فيديو مخصصاً بتكلفة أقل.',
      'How Zof Studio was engineered to deliver custom video at a lower cost.'
    ),
    api: t(
      'خطوات الحصول على المفاتيح وتفعيل كل مزود.',
      'Step-by-step key acquisition for every supported provider.'
    ),
    terms: t(
      'ترخيص MIT، وملاحظة ترخيص Remotion، ومسؤولية المفاتيح المحلية.',
      'MIT licensing, the Remotion notice, and local key responsibility.'
    ),
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-info-modal-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0B0E14] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 bg-[#0E121A] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2
              id="studio-info-modal-title"
              className="font-display text-base font-bold text-slate-50"
            >
              {titles[modal]}
            </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{subtitles[modal]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('إغلاق النافذة', 'Close dialog')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {modal === 'about' ? <AboutContent /> : null}
          {modal === 'api' ? <ApiGuideContent /> : null}
          {modal === 'terms' ? <TermsContent /> : null}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
  tone = 'sky',
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone?: 'sky' | 'emerald' | 'violet' | 'amber';
}) {
  const toneClass = {
    sky: 'border-sky-400/25 bg-sky-500/5 text-sky-200',
    emerald: 'border-emerald-400/25 bg-emerald-500/5 text-emerald-200',
    violet: 'border-violet-400/25 bg-violet-500/5 text-violet-200',
    amber: 'border-amber-400/25 bg-amber-500/5 text-amber-200',
  }[tone];

  return (
    <section className={`rounded-xl border p-3.5 ${toneClass}`}>
      <h3 className="flex items-center gap-2 text-xs font-bold text-slate-100">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
          {icon}
        </span>
        {title}
      </h3>
      <div className="mt-2 text-[11px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-1.5">
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function AboutContent() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent p-4">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-50">
          <Rocket className="h-4 w-4 text-amber-300" />
          {t('قصة بناء Zof Studio', 'Why I Built Zof Studio')}
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
          {t(
            'طُوِّرت هذه المنصة على يد مونتير فيديو (zoedit.com) انطلاقاً من تحديين واقعيين: العمل على حاسوب بمواصفات محدودة لا يسعف في البرامج الثقيلة، وضغط الوقت في عصر الذكاء الاصطناعي والسرعة. وبدل أن أكتفي بمشاهدة أدوات الذكاء الاصطناعي تستبدل المونتير، قررت بناء نظامي الإبداعي الخاص الذي يجمع أفضل العناصر والمهارات (Skills) لتوليد موشن جرافيك احترافي بأقل تكلفة — صنعته لنفسي أولاً، ثم قررت مشاركته مجاناً ومفتوح المصدر مع الجميع.',
            'Built by a freelance video editor (zoedit.com) facing two real constraints: working on a low-spec computer where heavy motion tools slow everything down, and keeping up with the speed of the AI era. Instead of waiting to be replaced by generic AI tools, I engineered my own AI-directed motion system—combining the best Remotion primitives, custom skills, and smart framing to produce studio-grade videos at minimal cost. Originally built for my own client work, now shared open-source with creators and editors everywhere.'
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ModalLink href={ZOFEDIT_URL} icon={<ExternalLink className="h-3.5 w-3.5" />}>
            zoedit.com
          </ModalLink>
          <ModalLink href={SITE_URL} icon={<ExternalLink className="h-3.5 w-3.5" />}>
            studio.zoedit.com
          </ModalLink>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-transparent p-4">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-50">
          <Rocket className="h-4 w-4 text-emerald-300" />
          {t('التثبيت والتشغيل (حاسوب محلي أو VPS)', 'Install & run (local PC or VPS)')}
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
          {t(
            'المتطلبات: Node.js v20+ وnpm وFFmpeg. تحقق منها أولاً:',
            'Prerequisites: Node.js v20+, npm, and FFmpeg. Verify them first:'
          )}
        </p>
        <pre
          dir="ltr"
          className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 font-mono text-[10px] leading-relaxed text-sky-200"
        >
          {'$ node -v && ffmpeg -version'}
        </pre>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-300">
          {t(
            '1. استنسخ المشروع وثبّته عالمياً:',
            '1. Clone the project and install it globally:'
          )}
        </p>
        <pre
          dir="ltr"
          className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 font-mono text-[10px] leading-relaxed text-sky-200"
        >
          {'$ git clone https://github.com/ZOF478/zofstudio.git zof-studio\n$ cd zof-studio\n$ npm install -g .'}
        </pre>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {t(
            'يثبّت postinstall اعتماديات لوحة التحكم ويسجّل أمر zofstudio العالمي تلقائياً.',
            'The postinstall step installs the dashboard dependencies and registers the global zofstudio command automatically.'
          )}
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-300">
          {t(
            '2. شغّل Zof Studio (اختر إعدادك):',
            '2. Launch Zof Studio (choose your setup):'
          )}
        </p>
        <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-200">
          {t(
            'الخيار أ: حاسوب محلي (Windows / macOS / Linux)',
            'Option A: Local computer (Windows / macOS / Linux)'
          )}
        </p>
        <pre
          dir="ltr"
          className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 font-mono text-[10px] leading-relaxed text-sky-200"
        >
          {'$ zofstudio'}
        </pre>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {t(
            'يبدأ على http://localhost:4789 ويفتح المتصفح تلقائياً. إغلاق الطرفية يوقف جميع العمليات.',
            'Starts at http://localhost:4789 and opens the browser automatically. Closing the terminal stops all background processes.'
          )}
        </p>
        <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-200">
          {t(
            'الخيار ب: خادم VPS بعيد (نفق SSH آمن)',
            'Option B: Remote VPS / server (secure SSH tunnel)'
          )}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {t(
            'من طرفيتك المحلية، افتح النفق:',
            'From your local terminal, open the tunnel:'
          )}
        </p>
        <pre
          dir="ltr"
          className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 font-mono text-[10px] leading-relaxed text-sky-200"
        >
          {'$ ssh -L 4789:127.0.0.1:4789 -L 3333:127.0.0.1:3333 user@your-server-ip'}
        </pre>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {t(
            'داخل جلسة SSH شغّل zofstudio، ثم افتح http://localhost:4789 في متصفحك المحلي. يبقى الخادم مرتبطاً بـ 127.0.0.1 للأمان.',
            'Inside that SSH session run zofstudio, then open http://localhost:4789 in your local browser. The server stays bound to 127.0.0.1 for security.'
          )}
        </p>
      </div>

      <InfoCard
        icon={<Heart className="h-3.5 w-3.5" />}
        title={t('لماذا ElevenLabs (V4)؟', 'Why ElevenLabs (V4)?')}
        tone="violet"
      >
        <blockquote className="border-s-2 border-violet-400/50 ps-3 text-[12px] leading-relaxed text-slate-300">
          {t(
            'ملاحظة صادقة من المؤسس: اخترنا ElevenLabs بعد تجربة إنتاجية موسعة في مشاريع حقيقية، لأنه يقدّم واقعية صوتية لا تُضاهى — خصوصاً نموذج V4 — بسعر عادل. الكود يبقى مفتوحاً بالكامل، فيمكنك إضافة مزودي TTS آخرين لاحقاً أو تخصيص نسختك بحرية.',
            'An honest founder note: ElevenLabs was selected after extensive real-world production experience because it delivers unmatched vocal realism — especially the V4 model — at a fair price. The codebase stays fully open, so you can add other TTS providers later or customize your own copy freely.'
          )}
        </blockquote>
      </InfoCard>

      <div className="rounded-xl border border-sky-400/25 bg-gradient-to-br from-sky-500/10 via-violet-500/5 to-transparent p-4">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-50">
          <Sparkles className="h-4 w-4 text-sky-300" />
          {t(
            'موشن جرافيك بجودة الاستوديو — بدون قوالب جاهزة',
            'Studio-grade motion graphics — without rigid templates'
          )}
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
          {t(
            'بُني Zof Studio عبر اختيار ودمج أفضل أوليات التصميم الحركي، ومهارات Remotion، وتأطير المناطق الآمنة، وخطوط البرومبت الذكية. النتيجة: فيديوهات مكتوبة بالكود خصيصاً لكل فكرة، بجودة استوديو وبأقل تكلفة ممكنة لواجهات الذكاء الاصطناعي.',
            'Zof Studio was engineered by curating and combining the best motion-design primitives, Remotion skills, safe-zone framing, and smart prompt pipelines. The result is custom-coded video for every idea — studio-grade quality at the lowest possible API cost.'
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard icon={<Cpu className="h-3.5 w-3.5" />} title={t('الهندسة الداخلية', 'Engineered pipeline')}>
          <BulletList
            items={[
              t(
                'أوليات حركية منتقاة بعناية بدلاً من قوالب متكررة.',
                'Carefully curated motion primitives instead of repeated templates.'
              ),
              t(
                'وصفات مهارات Remotion قابلة لإعادة الاستخدام داخل كل مشهد.',
                'Reusable Remotion skill recipes applied inside each scene.'
              ),
              t(
                'تأطير ذكي للمناطق الآمنة في TikTok وReels وShorts.',
                'Smart safe-zone framing for TikTok, Reels, and Shorts.'
              ),
              t(
                'خط برومبت يحوّل الفكرة إلى تقسيم مشاهد وسرد بصري.',
                'A prompt pipeline that turns an idea into scene breakdowns and visual storytelling.'
              ),
            ]}
          />
        </InfoCard>

        <InfoCard
          icon={<Server className="h-3.5 w-3.5" />}
          title={t('لماذا التكلفة أقل؟', 'Why the cost stays low')}
          tone="emerald"
        >
          <BulletList
            items={[
              t(
                'لا اشتراكات قوالب ولا رسوم منصات — الكود ملكك.',
                'No template subscriptions or platform fees — the code is yours.'
              ),
              t(
                'التصيير النهائي يتم محلياً عبر Remotion بتكلفة إطارات صفرية.',
                'Final rendering runs locally through Remotion with zero frame cost.'
              ),
              t(
                'نماذج LLM اقتصادية ومجانية عبر OpenCode وOpenRouter وDeepSeek.',
                'Economical and free LLM models through OpenCode, OpenRouter, and DeepSeek.'
              ),
              t(
                'معاينة سريعة وإعادة تصيير مع إعادة استخدام الصوت الحالي.',
                'Fast previews and re-renders that reuse the current voiceover.'
              ),
            ]}
          />
        </InfoCard>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#0E121A] p-3.5">
        <h3 className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <Sparkles className="h-3.5 w-3.5 text-sky-300" />
          {t('التقنيات الأساسية', 'Core tech stack')}
        </h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CREDITS.map((credit) => (
            <a
              key={credit.name}
              href={credit.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 transition-colors hover:border-sky-400/40 hover:bg-white/10"
            >
              {credit.Logo ? (
                <credit.Logo className="h-4 w-4 shrink-0 text-sky-300" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-white/20" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold text-slate-200">
                  {credit.name}
                </span>
                <span className="block truncate text-[9px] text-slate-500">
                  {t(credit.noteAr, credit.noteEn)}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ModalLink href={GITHUB_URL} icon={<Github className="h-3.5 w-3.5" />}>
          {t('استعرض الكود على GitHub', 'Explore the code on GitHub')}
        </ModalLink>
        <ModalLink href={SITE_URL} icon={<ExternalLink className="h-3.5 w-3.5" />}>
          studio.zoedit.com
        </ModalLink>
      </div>
    </div>
  );
}

interface ProviderGuide {
  key: string;
  name: string;
  href: string;
  badge: string;
  summary: string;
  steps: string[];
  commands?: string[];
  linkLabel: string;
  disclaimer?: string;
}

function ApiGuideContent() {
  const { t } = useI18n();

  const guides: ProviderGuide[] = [
    {
      key: 'opencode',
      name: 'OpenCode Free Models',
      href: 'https://opencode.ai',
      badge: t('مجاني', 'Free'),
      summary: t(
        'نماذج مجانية للبرمجة وكتابة المشاهد تُدار عبر OpenCode وشركائه، مع تبديل تلقائي عند تعذر أحد النماذج.',
        'Free coding and scene-writing models served through OpenCode and its partners, with automatic fallback.'
      ),
      steps: [
        t(
          'لا حاجة لتثبيت OpenCode يدوياً — فهو مرفق ومثبَّت تلقائياً مع npm install -g . أو npm run setup.',
          'No manual install needed — OpenCode CLI is already bundled and installed automatically with npm install -g . or npm run setup.'
        ),
        t(
          'سجّل الدخول عبر opencode واختر النماذج المجانية.',
          'Sign in through opencode and select the free models.'
        ),
        t(
          'اختر «OpenCode Free Models» داخل Zof Studio.',
          'Choose “OpenCode Free Models” inside Zof Studio.'
        ),
      ],
      commands: ['opencode auth login'],
      linkLabel: t('موقع OpenCode', 'OpenCode website'),
      disclaimer: t(
        'نماذج OpenCode المجانية يقدّمها OpenCode وشركاؤه، وليست مستضافة أو مملوكة لـ Zof Studio. قد تفرض حدوداً على الاستخدام أو تتغير توفرها في أي وقت.',
        'OpenCode free models are provided by OpenCode and its upstream partners — not hosted or owned by Zof Studio. They may have rate limits or change availability at any time.'
      ),
    },
    {
      key: 'deepseek',
      name: 'DeepSeek',
      href: 'https://platform.deepseek.com/api_keys',
      badge: t('مفتاح مطلوب', 'Key required'),
      summary: t(
        'مفاتيح DeepSeek مباشرة من حسابك، بتكلفة منخفضة جداً للنصوص المنظمة.',
        'Direct DeepSeek keys from your own account at ultra-low text generation cost.'
      ),
      steps: [
        t(
          'أنشئ حساباً على platform.deepseek.com.',
          'Create an account at platform.deepseek.com.'
        ),
        t('أنشئ مفتاح API يبدأ بـ sk-.', 'Create an API key that starts with sk-.'),
        t('أضف رصيداً صغيراً (التكلفة منخفضة جداً).', 'Top up a small balance (ultra-low cost).'),
        t(
          'الصق المفتاح في Zof Studio → إعدادات API.',
          'Paste the key into Zof Studio → API & Keys.'
        ),
      ],
      linkLabel: t('مفاتيح DeepSeek', 'DeepSeek API keys'),
    },
    {
      key: 'elevenlabs',
      name: 'ElevenLabs',
      href: 'https://elevenlabs.io/app/developers/api-keys',
      badge: t('مفتاح مطلوب', 'Key required'),
      summary: t(
        'التعليق الصوتي والمؤثرات الصوتية بأصوات واقعية، بما فيها نموذج V4.',
        'Voiceover and sound effects with realistic voices, including the V4 model.'
      ),
      steps: [
        t(
          'افتح صفحة مفاتيح API في ElevenLabs للمطورين.',
          'Open the ElevenLabs developer API keys page.'
        ),
        t('أنشئ مفتاحاً يبدأ بـ sk_.', 'Generate a key that starts with sk_.'),
        t(
          'فعّل الصلاحيات التالية عند إنشاء المفتاح: Text to Speech Access و Models Access و User Access و History Read.',
          'Enable these permissions when creating the key: Text to Speech Access, Models Access, User Access, and History Read.'
        ),
        t(
          'تتيح هذه الصلاحيات لعارض الاستخدام والسجل المدمج في Zof Studio عرض الحصة المتبقية والتوليدات السابقة.',
          'These permissions let Zof Studio’s built-in usage and history viewer display remaining quota and past generations.'
        ),
        t(
          'الصق المفتاح في Zof Studio → إعدادات API.',
          'Paste the key into Zof Studio → API & Keys.'
        ),
      ],
      linkLabel: t('مفاتيح ElevenLabs', 'ElevenLabs API keys'),
    },
    {
      key: 'openrouter',
      name: 'OpenRouter',
      href: 'https://openrouter.ai/keys',
      badge: t('مفتاح مطلوب', 'Key required'),
      summary: t(
        'وصول لمئات النماذج عبر مفتاح واحد، مع فئات :free مجانية.',
        'Access hundreds of models with one key, including free :free tiers.'
      ),
      steps: [
        t('أنشئ حساب OpenRouter.', 'Create an OpenRouter account.'),
        t(
          'ولّد مفتاحاً يبدأ بـ sk-or-v1-.',
          'Generate a key that starts with sk-or-v1-.'
        ),
        t(
          'أضف رصيداً إن رغبت، أو استخدم نماذج :free.',
          'Add credit if you like, or use :free models.'
        ),
        t(
          'الصق المفتاح في Zof Studio → إعدادات API.',
          'Paste the key into Zof Studio → API & Keys.'
        ),
      ],
      linkLabel: t('مفاتيح OpenRouter', 'OpenRouter keys'),
    },
    {
      key: 'kieai',
      name: 'Kie.ai',
      href: 'https://kie.ai/api-key',
      badge: t('مفتاح مطلوب', 'Key required'),
      summary: t(
        'إكمالات محادثة متوافقة مع OpenAI عبر Kie.ai.',
        'OpenAI-compatible chat completions through Kie.ai.'
      ),
      steps: [
        t('افتح صفحة مفاتيح Kie.ai.', 'Open the Kie.ai API key page.'),
        t('أنشئ مفتاح API وانسخه.', 'Create and copy an API key.'),
        t(
          'الصق المفتاح في Zof Studio → إعدادات API.',
          'Paste the key into Zof Studio → API & Keys.'
        ),
      ],
      linkLabel: t('مفاتيح Kie.ai', 'Kie.ai API key'),
    },
    {
      key: 'custom',
      name: t('مزود مخصص', 'Custom provider'),
      href: 'https://opencode.ai',
      badge: t('متوافق مع OpenAI', 'OpenAI-compatible'),
      summary: t(
        'اربط أي نقطة نهاية متوافقة مع OpenAI مثل Groq أو Together أو Ollama أو vLLM المستضاف ذاتياً.',
        'Connect any OpenAI-compatible endpoint such as Groq, Together, Ollama, or self-hosted vLLM.'
      ),
      steps: [
        t('أدخل اسم المزود في إعدادات API.', 'Enter the provider name in API & Keys.'),
        t(
          'أدخل Base URL كاملاً ينتهي بـ /v1.',
          'Enter the full Base URL ending with /v1.'
        ),
        t('أضف مفتاح API إن كان مزودك يتطلبه.', 'Add an API key if your endpoint requires one.'),
        t(
          'اكتب معرّف النموذج أو اختره من القائمة.',
          'Type the model ID or select it from the list.'
        ),
      ],
      linkLabel: t('مزيد عن OpenCode', 'More about OpenCode'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 p-3.5 text-[11px] leading-relaxed text-slate-300">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <span>
            {t(
              'تُحفظ جميع المفاتيح محلياً في ~/.zof-studio/settings.json ولا تُرسل إلى خوادم Zof Studio. كل مزود خدمة مستقل بشروطه وأسعاره وتوفره.',
              'All keys are stored locally in ~/.zof-studio/settings.json and are never sent to Zof Studio servers. Each provider is an independent service with its own terms, pricing, and availability.'
            )}
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {guides.map((guide, index) => (
          <section
            key={guide.key}
            className="rounded-xl border border-white/8 bg-[#0E121A] p-3.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-mono text-[11px] font-bold text-slate-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-100">{guide.name}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    {guide.summary}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold text-sky-200">
                {guide.badge}
              </span>
            </div>

            {guide.disclaimer ? (
              <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-amber-100/90">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
                <span>{guide.disclaimer}</span>
              </p>
            ) : null}

            <ol className="mt-2.5 space-y-1.5">
              {guide.steps.map((step, stepIndex) => (
                <li key={step} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-300">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-[9px] text-slate-400">
                    {stepIndex + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {guide.commands ? (
              <pre
                dir="ltr"
                className="mt-2.5 overflow-x-auto rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 font-mono text-[10px] leading-relaxed text-sky-200"
              >
                {guide.commands.map((command) => `$ ${command}`).join('\n')}
              </pre>
            ) : null}

            <a
              href={guide.href}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-sky-200 transition-colors hover:bg-sky-500/20"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {guide.linkLabel}
              <ArrowUpRight className="h-2.5 w-2.5" />
            </a>
          </section>
        ))}
      </div>
    </div>
  );
}

function TermsContent() {
  const { t } = useI18n();

  return (
    <div className="space-y-3.5">
      <InfoCard icon={<Scale className="h-3.5 w-3.5" />} title={t('ترخيص Zof Studio (MIT)', 'Zof Studio license (MIT)')} tone="sky">
        <p>
          {t(
            'Zof Studio برنامج مجاني ومفتوح المصدر يُقدّم «كما هو» دون ضمانات. يمكن لأي شخص فحص الكود وتعديله واستضافته ذاتياً، مع الإبقاء على إشعار الترخيص.',
            'Zof Studio is free and open-source software provided “as is” without warranties. Anyone can inspect, modify, and self-host it while keeping the license notice.'
          )}
        </p>
        <ModalLink href={`${GITHUB_URL}/blob/main/LICENSE`} icon={<FileText className="h-3.5 w-3.5" />}>
          {t('قراءة نص ترخيص MIT', 'Read the MIT license')}
        </ModalLink>
      </InfoCard>

      <InfoCard
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        title={t('ملاحظة ترخيص Remotion', 'Remotion license notice')}
        tone="amber"
      >
        <p>
          {t(
            'Remotion مجاني للأفراد والفرق والشركات الصغيرة حتى 3 أشخاص بموجب ترخيص Remotion الرسمي. المؤسسات التي تضم 4 أشخاص أو أكثر تحتاج إلى ترخيص Remotion تجاري.',
            'Remotion is free for individuals and small teams or companies of up to 3 people under Remotion’s official license. Organizations with 4 or more people require a commercial Remotion license.'
          )}
        </p>
        <ModalLink href={REMOTION_LICENSE_URL} icon={<ExternalLink className="h-3.5 w-3.5" />}>
          {t('مراجعة ترخيص Remotion', 'Review the Remotion license')}
        </ModalLink>
      </InfoCard>

      <InfoCard
        icon={<Server className="h-3.5 w-3.5" />}
        title={t('مزودون ونماذج خارجية', 'Third-party providers & models')}
        tone="violet"
      >
        <p>
          {t(
            'نماذج OpenCode المجانية وDeepSeek وOpenRouter وKie.ai و ElevenLabs خدمات مستقلة تابعة لجهات خارجية، وتخضع لشروطها وأسعارها وتوفرها الخاص. لا تملك Zof Studio النماذج المجانية ولا تضمن استمرارها أو جودتها.',
            'OpenCode free models, DeepSeek, OpenRouter, Kie.ai, and ElevenLabs are independent third-party services governed by their own terms, pricing, and availability. Zof Studio does not own or guarantee third-party free models.'
          )}
        </p>
      </InfoCard>

      <InfoCard
        icon={<Lock className="h-3.5 w-3.5" />}
        title={t('خصوصية المفاتيح ومسؤولية المستخدم', 'Local key privacy & user responsibility')}
        tone="emerald"
      >
        <p>
          {t(
            'تُخزَّن مفاتيح API محلياً فقط في ~/.zof-studio/settings.json ولا تُرسل إلى خوادم Zof Studio. المستخدم مسؤول بالكامل عن استخدامه لواجهات API وعن المحتوى الذي يولّده.',
            'API keys are stored strictly locally in ~/.zof-studio/settings.json and never sent to Zof Studio servers. Users are fully responsible for their API usage and the content they generate.'
          )}
        </p>
      </InfoCard>
    </div>
  );
}

function ModalLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 transition-colors hover:border-sky-400/40 hover:text-slate-50"
    >
      {icon}
      {children}
      <ArrowUpRight className="h-2.5 w-2.5 text-slate-500" />
    </a>
  );
}
