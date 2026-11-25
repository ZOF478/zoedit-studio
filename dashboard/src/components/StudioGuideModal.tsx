import { useEffect, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clapperboard,
  Layers,
  Mic,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { StudioFooter, type StudioInfoModalId } from './StudioFooter';

interface StudioGuideModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInfoModal: (modal: StudioInfoModalId) => void;
}

type GuideTab = 'guide' | 'terms';

function SectionCard({
  icon,
  title,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  tone: 'sky' | 'amber' | 'violet' | 'emerald' | 'rose';
  children: ReactNode;
}) {
  const toneClass = {
    sky: 'border-sky-400/25 bg-sky-500/5 text-sky-200',
    amber: 'border-amber-400/25 bg-amber-500/5 text-amber-200',
    violet: 'border-violet-400/25 bg-violet-500/5 text-violet-200',
    emerald: 'border-emerald-400/25 bg-emerald-500/5 text-emerald-200',
    rose: 'border-rose-400/25 bg-rose-500/5 text-rose-200',
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

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" />
      <span>{children}</span>
    </li>
  );
}

export function StudioGuideModal({ open, onClose, onOpenInfoModal }: StudioGuideModalProps) {
  const { t, dir } = useI18n();
  const [tab, setTab] = useState<GuideTab>('guide');

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  const tabs: Array<{ id: GuideTab; label: string; icon: typeof BookOpen }> = [
    {
      id: 'guide',
      label: t('دليل الاستخدام والمزايا', 'Visual Instructions & Feature Guide'),
      icon: BookOpen,
    },
    {
      id: 'terms',
      label: t('دليل الاستخدام والترخيص', 'Guide, License & Ethical Use'),
      icon: Scale,
    },
  ];

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-guide-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0B0E14] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 bg-[#0E121A] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id="studio-guide-title" className="font-display text-base font-bold text-slate-50">
              {t('دليل الاستخدام والترخيص', 'Guide, License & Ethical Use')}
            </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
              {t(
                'يعمل Zoedit Studio محلياً 100% على جهازك بترخيص MIT، بدون قياس سحابي أو تتبّع، مع إرشادات الاستخدام المسؤول.',
                'Zoedit Studio runs 100% locally on your machine under the MIT license with zero cloud telemetry, plus responsible-use guidance.'
              )}
            </p>
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

        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/8 bg-[#080B11] px-4 py-2 sm:px-5">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-selected={active}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-500/15 text-sky-100 ring-1 ring-inset ring-sky-400/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-sky-300' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {tab === 'guide' ? (
            <div className="space-y-3">
              <SectionCard
                icon={<Clapperboard className="h-3.5 w-3.5" />}
                title={t('Clean B-Roll Mode — حركة بصرية مركزة', 'Clean B-Roll Mode — focused visual motion')}
                tone="amber"
              >
                <ul className="space-y-1.5">
                  <Bullet>
                    {t(
                      'عند تفعيله، يحذف مولّد المشاهد العناوين الرئيسية والنصوص التعريفية والشرائح النصية فقط، ويترك الحركة والرسوم هي البطل.',
                      'When enabled, scene generation removes main headlines, titles, and text-only slides, leaving motion and graphics as the focus.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'يحتفظ بالتسميات القصيرة داخل المشهد مثل أرقام المخططات وقيم المحاور وأسماء المواقع وتعليقات الرسم الضرورية لفهم الفكرة.',
                      'It preserves brief in-scene labels such as chart numbers, axis values, map names, and essential diagram annotations needed to understand the visual.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'التعليق الصوتي (TTS) والكابشن يظلان اختياريين: يمكنك تشغيل أو إيقاف أي منهما بشكل مستقل.',
                      'Voiceover (TTS) and captions remain optional — you can enable or disable either independently.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'مناسب للمقدّمات البصرية، الإعلانات، ولقطات B-Roll السينمائية.',
                      'Best for visual intros, ads, and cinematic B-roll shots.'
                    )}
                  </Bullet>
                </ul>
              </SectionCard>

              <SectionCard
                icon={<Layers className="h-3.5 w-3.5" />}
                title={t('2.5D Depth Mode — عمق سينمائي بطبقات', '2.5D Depth Mode — layered cinematic depth')}
                tone="violet"
              >
                <ul className="space-y-1.5">
                  <Bullet>
                    {t(
                      'يضيف 2-5 طبقات كروت تتحرك بسرعات مختلفة مع منظور وتراجع في محور Z.',
                      'Adds 2-5 card layers moving at different speeds with perspective and Z-axis recession.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'استخدمه للقصص والمقارنات والمشاهد العاطفية؛ واتركه مغلقاً للمخططات السريعة المسطحة.',
                      'Use it for stories, comparisons, and emotional beats; leave it off for fast flat charts.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'قد يزيد وقت كتابة الكود والريندر قليلاً مقابل عمق بصري أكبر.',
                      'It may slightly increase coding and render time in exchange for richer depth.'
                    )}
                  </Bullet>
                </ul>
              </SectionCard>

              <SectionCard
                icon={<Mic className="h-3.5 w-3.5" />}
                title={t('Voiceover vs Silent — الصوت أم الحركة فقط', 'Voiceover vs Silent — audio or motion only')}
                tone="sky"
              >
                <ul className="space-y-1.5">
                  <Bullet>
                    {t(
                      'مع TTS: يكتب الذكاء الاصطناعي سكربتاً صوتياً ويولّد تعليقاً عبر ElevenLabs مع كابشن متزامن اختياري.',
                      'With TTS: AI writes a spoken script and generates ElevenLabs voiceover with optional synced captions.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'بدون TTS: يعتمد الفيديو على النصوص الحركية والرسوم لنقل الفكرة بالكامل.',
                      'Without TTS: kinetic typography and graphics carry the message end to end.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'الكابشن لا يظهر إذا كان الصوت مغلقاً، ويمكن إخفاؤه يدوياً حتى مع تشغيل الصوت.',
                      'Captions do not render when voiceover is off, and can be hidden manually even with voiceover on.'
                    )}
                  </Bullet>
                </ul>
              </SectionCard>

              <SectionCard
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                title={t('Safe Zone — مناطق أمان المنصات', 'Safe Zone — platform-safe framing')}
                tone="emerald"
              >
                <ul className="space-y-1.5">
                  <Bullet>
                    {t(
                      'يحافظ على النصوص والكروت بعيداً عن أزرار TikTok/Reels/Shorts وشريط الوصف والكابشن.',
                      'Keeps text and cards clear of TikTok/Reels/Shorts action buttons, description bar, and captions.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'يمكنك معاينة إطارات المنصات من خلال قائمة "إطار المنصة" أعلى المشغّل.',
                      'Preview each platform frame from the “Platform frame” selector above the player.'
                    )}
                  </Bullet>
                </ul>
              </SectionCard>

              <SectionCard
                icon={<Sparkles className="h-3.5 w-3.5" />}
                title={t('نصائح كتابة البرومبت', 'Prompt writing tips')}
                tone="sky"
              >
                <ul className="space-y-1.5">
                  <Bullet>
                    {t(
                      'اكتب فكرة واحدة واضحة لكل مشهد، وحدد الهدف والمشاعر والأرقام المطلوبة.',
                      'Write one clear idea per scene and specify the goal, emotion, and required numbers.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'اذكر الأسلوب البصري والألوان والانتقالات المطلوبة بشكل صريح.',
                      'State the visual style, colors, and transition energy explicitly.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'استخدم زر التعديل السريع لتعديل الحركة أو التخطيط دون إعادة توليد الصوت.',
                      'Use Quick prompt tweak to adjust motion or layout without regenerating audio.'
                    )}
                  </Bullet>
                </ul>
              </SectionCard>
            </div>
          ) : (
            <div className="space-y-3">
              <SectionCard
                icon={<Scale className="h-3.5 w-3.5" />}
                title={t('ترخيص MIT مفتوح المصدر', 'MIT Open-Source License')}
                tone="sky"
              >
                <p>
                  {t(
                    'Zoedit Studio برنامج مجاني ومفتوح المصدر بنسبة 100% ويُقدّم «كما هو» دون ضمانات. يمكنك فحص الكود وتعديله واستضافته ذاتياً مع الإبقاء على إشعار الترخيص MIT.',
                    'Zoedit Studio is 100% free and open-source software provided “as is” without warranties. You may inspect, modify, and self-host it while keeping the MIT license notice.'
                  )}
                </p>
              </SectionCard>

              <SectionCard
                icon={<Sparkles className="h-3.5 w-3.5" />}
                title={t('أخلاقيات المبدع وإرشادات الاستخدام المسؤول', 'Creator Ethos & Responsible Use Guidelines')}
                tone="emerald"
              >
                <p className="mb-2">
                  {t(
                    'نشجّعك على استخدام Zoedit Studio لصناعة محتوى نافع وصادق ومحترم. هذه إرشادات مجتمعية وليست قيوداً على ترخيص MIT مفتوح المصدر.',
                    'We encourage you to use Zoedit Studio to create beneficial, honest, and respectful content. These are community guidelines, not restrictions on the MIT open-source license.'
                  )}
                </p>
                <ul className="space-y-1.5">
                  <Bullet>
                    {t(
                      'ساهم بمحتوى يضيف قيمة: تعليم، تفسير، إبداع، أو توثيق صادق.',
                      'Contribute content that adds value: education, explanation, creativity, or honest documentation.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'كن صادقاً وواضحاً، وتجنّب التضليل أو الانتحال أو الأخبار الكاذبة.',
                      'Be honest and transparent; avoid deception, impersonation, or false news.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'احترم حقوق الآخرين، ولا تستخدم الأصوات أو الصور أو العلامات التجارية دون إذن قانوني.',
                      'Respect others’ rights, and do not use voices, likenesses, or trademarks without legal permission.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'تجنّب المحتوى المضر أو المهدد أو التمييزي أو غير القانوني.',
                      'Avoid harmful, threatening, discriminatory, or illegal content.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'أنت مسؤول بالكامل عن المحتوى الذي تولّده وعن التزامك بقوانين بلدك.',
                      'You are fully responsible for the content you generate and for complying with your local laws.'
                    )}
                  </Bullet>
                </ul>
              </SectionCard>

              <SectionCard
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                title={t('الخصوصية المحلية أولاً ومزودو الخدمات الخارجيون', 'Local-First Privacy & Third-Party APIs')}
                tone="violet"
              >
                <ul className="space-y-1.5">
                  <Bullet>
                    {t(
                      'يعمل Zoedit Studio محلياً بالكامل على جهازك؛ لا توجد خدمة سحابية تابعة لـ Zoedit Studio.',
                      'Zoedit Studio runs entirely locally on your machine; there is no Zoedit Studio cloud service.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'مفاتيح API والملفات المولّدة تبقى على جهازك المحلي فقط، بدون أي تتبّع أو قياس عن بُعد أو مزامنة سحابية.',
                      'API keys and generated files stay strictly on your local device, with zero telemetry, cloud tracking, or cloud sync.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'عند الاتصال بمزودي خدمات خارجيين مثل OpenCode وDeepSeek وOpenRouter وElevenLabs، تخضع بياناتك لشروطهم وسياسات الخصوصية الخاصة بهم، وأنت مسؤول عن الالتزام بها.',
                      'When you connect to third-party providers such as OpenCode, DeepSeek, OpenRouter, and ElevenLabs, your data is governed by their own terms and privacy policies, and you are responsible for complying with them.'
                    )}
                  </Bullet>
                  <Bullet>
                    {t(
                      'لا تملك Zoedit Studio هذه الخدمات الخارجية ولا تضمن استمرارها أو أسعارها أو جودة مخرجاتها.',
                      'Zoedit Studio does not own these third-party services and does not guarantee their availability, pricing, or output quality.'
                    )}
                  </Bullet>
                </ul>
              </SectionCard>
            </div>
          )}

          <div className="mt-5 border-t border-white/8 pt-4">
            <StudioFooter onOpenModal={onOpenInfoModal} />
          </div>
        </div>
      </div>
    </div>
  );
}
