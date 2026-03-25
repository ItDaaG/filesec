
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Share2,
  Bot,
  Upload,
  FolderOpen,
  Send,
  Check,
  ArrowRight,
  FileText,
  Image,
  Music,
  Video,
  Sparkles,
  Lock,
  Users,
  Zap,
  Menu,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Utility: scroll-triggered fade wrapper                            */
/* ------------------------------------------------------------------ */
function FadeSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating file icon for hero illustration                          */
/* ------------------------------------------------------------------ */
function FloatingIcon({ icon: Icon, className, delay }: { icon: any; className: string; delay: number }) {
  return (
    <motion.div
      className={`absolute rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-3 shadow-lg ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <Icon className="h-5 w-5 text-primary" />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  LANDING PAGE                                                      */
/* ------------------------------------------------------------------ */
  export const LandingPage = () => {

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
  
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        {/* Dot grid bg */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> AI-Powered File Management
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your files,
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                intelligently managed.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Secure cloud storage meets an AI assistant that organises, summarises, and manages your files — so you can focus on what matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/dashboard">
                  Start Free <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-accent" /> Free 10 GB</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-accent" /> No credit card</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-accent" /> Encryption</span>
            </div>
          </motion.div>

          {/* Hero illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto hidden w-full max-w-md lg:block"
          >
            <div className="relative rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-6 shadow-xl">
              {/* Mock dashboard */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-accent/60" />
                <div className="ml-auto h-2 w-24 rounded-full bg-muted" />
              </div>
              <div className="space-y-3">
                {[["Project Brief.pdf", FileText], ["Design_v3.png", Image], ["Podcast_ep12.mp3", Music], ["Demo_video.mp4", Video]].map(([name, Icon]: any, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-background/60 px-3 py-2.5">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{name}</span>
                    <div className="ml-auto h-2 w-12 rounded-full bg-muted" />
                  </div>
                ))}
              </div>
              {/* AI hint */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-xs text-primary">Summarize Project Brief.pdf...</span>
                <div className="ml-auto h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
              </div>
            </div>
            {/* Floating icons */}
            <FloatingIcon icon={Shield} className="-left-6 top-8" delay={0} />
            <FloatingIcon icon={Share2} className="-right-6 top-1/3" delay={0.8} />
            <FloatingIcon icon={Lock} className="-left-4 bottom-12" delay={1.6} />
          </motion.div>
        </div>
      </section>

      {/* ── Social Proof ───────────────────────────────────────── */}
      <section className="border-y border-border/50 bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by 10,000+ teams worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {["Acme Corp", "Globex", "Soylent", "Initech", "Umbrella", "Hooli"].map((name) => (
              <span key={name} className="font-heading text-lg font-semibold text-muted-foreground/40">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeSection className="text-center">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Everything you need, nothing you don't</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Built from the ground up for teams that care about security, speed, and simplicity.
          </p>
        </FadeSection>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Secure File Storage",
              desc: "Encrypted file storage. Know your data is safe.",
              color: "black",
              bg: "bg-black/15",
            },
            {
              icon: Share2,
              title: "Effortless Sharing",
              desc: "Share with a link, and control who can access your files.",
              color: "text-green-500",
              bg: "bg-green-500/15",
            },
            {
              icon: Bot,
              title: "AI File Assistant",
              desc: "An intelligent agent that organizes, summarizes, converts, and manages your files on your behalf.",
              color: "text-chart-4",
              bg: "bg-chart-4/5",
            },
          ].map((f, i) => (
            <FadeSection key={f.title} delay={i * 0.1}>
              <div className="group relative rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
                <div className={`mb-4 inline-flex rounded-xl ${f.bg} p-3`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </FadeSection>
          ))}
        </div>
      </section>

      {/* ── AI Spotlight ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-foreground py-20 text-background">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(hsl(var(--background)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeSection className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3" /> The Filesec Difference
            </div>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Meet Cipher, your AI file assistant
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-background/60">
              Just tell it what you need. It handles the rest.
            </p>
          </FadeSection>

          <FadeSection delay={0.2} className="mx-auto mt-12 max-w-2xl">
            {/* Mock chat interface */}
            <div className="rounded-2xl border border-background/10 bg-background/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-background/10 px-5 py-3">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Cipher</span>
                <div className="ml-auto flex items-center gap-1">
                </div>
              </div>
              <div className="space-y-4 p-5">
                {[
                  { user: true, text: "Organize my downloads folder by file type" },
                  { user: false, text: "Done! I've sorted 47 files into 5 folders: Documents (12), Images (18), Videos (8), Audio (5), and Archives (4)." },
                  { user: true, text: "Summarize the Q4 report PDF" },
                  { user: false, text: "Here's your summary: Revenue grew 23% YoY to $4.2M. Key drivers were enterprise expansion (+31%) and reduced churn (from 5.2% to 3.1%)..." },
                ].map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                    className={`flex ${msg.user ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.user ? "bg-primary text-primary-foreground" : "bg-background/10 text-background/80"}`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-background/10 px-5 py-3">
                <div className="flex-1 rounded-lg bg-background/5 px-3 py-2 text-sm text-background/30">
                  Ask your assistant anything...
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Send className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeSection className="text-center">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Get started in three steps</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">No complex setup. No learning curve. Just drop your files and go.</p>
        </FadeSection>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            { icon: Upload, step: "01", title: "Upload", desc: "Drag & drop — any file type, any size. We handle the rest." },
            { icon: FolderOpen, step: "02", title: "Organize", desc: "Sort your files however you want. We'll help you manage them."},
            { icon: Send, step: "03", title: "Share", desc: "Generate secure links, set expiry dates, and control who sees what." },
          ].map((s, i) => (
            <FadeSection key={s.step} delay={i * 0.12}>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="font-heading text-xs font-bold uppercase tracking-widest text-muted-foreground">Step {s.step}</span>
                <h3 className="mt-1 font-heading text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </FadeSection>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-border/50 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeSection className="text-center">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Start free. Upgrade when you need more.</p>
          </FadeSection>

          <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                desc: "For personal use",
                features: ["10 GB storage", "Sharing", "5 AI queries/day", "Encryption"],
                cta: "Get Started",
                popular: false,
              },
              {
                name: "Pro",
                price: "$12",
                desc: "For power users",
                features: ["100 GB storage", "Sharing", "Unlimited AI queries", "Encryption"],
                cta: "Start Pro Trial",
                popular: true,
              },
              {
                name: "Pro+",
                price: "$29",
                desc: "For when you really need the space",
                features: ["1 TB storage", "Sharing", "Unlimited AI queries", "Encryption"],
                cta: "Start Pro+ Trial",
                popular: false,
              },
            ].map((plan, i) => (
              <FadeSection key={plan.name} delay={i * 0.1}>
                <div className={`relative flex flex-col rounded-2xl border p-6 ${plan.popular ? "border-primary bg-card shadow-xl ring-1 ring-primary/20" : "border-border bg-card"}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                      Most Popular
                    </span>
                  )}
                  <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-heading text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "$0" && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-accent" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <FadeSection>
            <h2 className="font-heading text-3xl font-bold text-primary-foreground sm:text-4xl">
              Ready to let AI manage your files?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">
              Join thousands of teams who've already made the switch to smarter file management.
            </p>
            <Button size="lg" variant="secondary" className="mt-8" asChild>
              <Link to="/dashboard">
                Get Started Free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </FadeSection>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-heading text-lg font-bold">Filesec</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                AI-powered file storage and sharing for modern teams.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Security", "Integrations"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Cookie Policy", "GDPR"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-heading text-sm font-semibold">{col.title}</h4>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Filesec. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};