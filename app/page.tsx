"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence } from "framer-motion";
import { Send, Share2, MessageSquare, Github, Lock, Database, Server, Terminal as TerminalIcon, Shield, ChevronDown, Copy, Check, ArrowRight, X, Code, FileText, Users, Zap, Smartphone, Clock, MousePointer2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import { GitHubBadge } from "@/components/github-badge";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { TypingTextReveal } from "@/components/typing-text-reveal";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- Components ---

function TiltCard({ href, icon: Icon, title, description, badge }: { href: string; icon: any; title: string; description: string; badge?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const xPct = mouseX.set((clientX - left) / width - 0.5);
    const yPct = mouseY.set((clientY - top) / height - 0.5);
  }

  function onMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

  return (
    <Link href={href} className="block w-full h-full perspective-1000">
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative h-full w-full rounded-2xl bg-card border border-primary/20 p-6 md:p-8 shadow-xl transition-shadow hover:shadow-primary/20 group cursor-pointer"
      >
        <div style={{ transform: "translateZ(50px)" }} className="relative z-10 flex flex-col h-full items-center text-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-colors" />
            <div className="relative bg-muted border border-primary/20 p-4 rounded-full text-primary group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-8 h-8 md:w-10 md:h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold font-righteous text-foreground group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed md:block hidden mb-4">{description}</p>
          </div>
          {badge && (
             <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
               {badge}
             </span>
          )}
        </div>
        
        {/* Shine effect */}
        <motion.div
          style={{
            background: useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.1), transparent 80%)`,
          }}
          className="absolute inset-0 z-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
      </motion.div>
    </Link>
  );
}

function MobileCard({ href, icon: Icon, title, description }: { href: string; icon: any; title: string; description: string }) {
  return (
    <Link href={href} className="w-full group">
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="relative w-full overflow-hidden"
      >
        <div className="relative p-5 rounded-2xl border-2 border-primary/50 group-hover:border-primary bg-card/80 backdrop-blur-sm transition-all duration-300">
          <div className="flex items-center gap-4 h-full">
            <div className="relative flex-shrink-0">
               <div className="relative p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/30 group-hover:border-primary transition-colors">
                 <Icon className="h-6 w-6 text-primary" />
               </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold font-righteous text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            </div>
            
            <div>
              <ArrowRight className="h-5 w-5 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function FeatureItem({ icon: Icon, title, description, index }: { icon: any, title: string, description: string, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card/80 transition-colors"
    >
      <div className="p-3 rounded-xl bg-primary/10 text-primary mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-lg font-bold mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}

function DockerTerminal() {
  const [copied, setCopied] = useState(false);
  const command = "docker run -p 3000:3000 pastaa/pastaa";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl bg-[#1e1e1e] border border-white/10 font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="text-white/30 text-xs">bash — 80x24</div>
        <div className="w-12" />
      </div>
      
      <div className="p-6 text-gray-300 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-green-400">➜</span>
          <span className="text-blue-400">~</span>
          <span className="text-white">{command}</span>
          <button 
            onClick={handleCopy}
            className="ml-auto hover:bg-white/10 p-1.5 rounded-md transition-colors text-white/50 hover:text-white"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-gray-500 animate-pulse">
          Waiting for container to start...
        </div>
      </div>
    </div>
  );
}

// --- Demo Components ---

function SendDemo() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const fullText = "My secret password is: pasta-lover-123";

  useEffect(() => {
    if (step === 0) {
      let i = 0;
      const interval = setInterval(() => {
        setText(fullText.slice(0, i + 1));
        i++;
        if (i >= fullText.length) {
          clearInterval(interval);
          setTimeout(() => setStep(1), 1000);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [step]);

  return (
    <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
        <div className="w-3 h-3 rounded-full bg-green-500/50" />
        <span className="ml-2 text-xs text-muted-foreground font-mono">pastaa.io/send</span>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{t('textPlaceholder')}</label>
          <div className="w-full h-32 p-3 rounded-md bg-muted/50 text-sm font-mono break-all border border-border/50">
            {step >= 2 ? (
              <span className="text-green-500">
                U2FsdGVkX19v8+tH5J2...
                <br/>
                [Encrypted AES-256]
              </span>
            ) : (
              text
            )}
            <span className="animate-pulse">|</span>
          </div>
        </div>
        
        {step === 1 && (
           <motion.button
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             onClick={() => setStep(2)}
             className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold flex items-center justify-center gap-2"
           >
             <Lock className="w-4 h-4" />
             {t('encryptBtn')}
           </motion.button>
        )}
        
        {step === 2 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-3 bg-primary/10 rounded-md border border-primary/20 flex items-center justify-between"
          >
             <span className="text-xs font-mono text-primary truncate">pastaa.io/v/a8k2...#key</span>
             <Check className="w-4 h-4 text-primary" />
          </motion.div>
        )}

        {step === 2 && (
          <button onClick={() => { setStep(0); setText(""); }} className="text-xs text-muted-foreground hover:text-foreground w-full text-center mt-2">
            Reset Demo
          </button>
        )}
      </div>
    </div>
  );
}

function ShareDemo() {
  const [step, setStep] = useState(0);
  
  const code = [
    "function shareCode() {",
    "  const socket = io();",
    "  socket.emit('sync', data);",
    "  return 'Collaborating!';",
    "}"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s > code.length + 4 ? 0 : s + 1));
    }, 800);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = code.slice(0, Math.min(step, code.length));

  return (
    <div className="w-full max-w-md bg-[#1e1e1e] rounded-xl border border-white/10 shadow-2xl overflow-hidden font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5">
        <span className="text-white/50 text-xs">main.ts - Edited by Alice</span>
        <div className="flex -space-x-2">
           <div className="w-6 h-6 rounded-full bg-blue-500 border border-[#252526] flex items-center justify-center text-[10px] text-white">A</div>
           <div className="w-6 h-6 rounded-full bg-purple-500 border border-[#252526] flex items-center justify-center text-[10px] text-white">B</div>
        </div>
      </div>
      <div className="p-4 h-48 overflow-hidden text-gray-300">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-4">
             <span className="text-gray-600 select-none w-4 text-right">{i + 1}</span>
             <span>
               <span className="text-pink-400">{line.includes('function') ? 'function' : ''}</span>
               <span className="text-blue-400">{line.includes('const') ? 'const' : ''}</span>
               <span className="text-yellow-300">{line.includes('return') ? 'return' : ''}</span>
               <span className="text-white">{line.replace(/function|const|return/g, '')}</span>
             </span>
          </div>
        ))}
        <div className="flex gap-4 animate-pulse">
           <span className="text-gray-600 select-none w-4 text-right">{lines.length + 1}</span>
           <span className="w-2 h-4 bg-blue-500/50 block" />
        </div>
      </div>
    </div>
  );
}

function CursorDemo() {
  return (
    <div className="w-full max-w-md bg-card rounded-xl border border-primary/20 shadow-2xl overflow-hidden h-[320px] relative font-mono text-sm p-6 select-none cursor-none bg-grid-black/[0.02] dark:bg-grid-white/[0.02]">
      <div className="space-y-4 opacity-30">
        <div className="h-4 w-3/4 bg-foreground/20 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-foreground/20 rounded animate-pulse delay-100" />
        <div className="h-4 w-5/6 bg-foreground/20 rounded animate-pulse delay-200" />
        <div className="h-4 w-2/3 bg-foreground/20 rounded animate-pulse delay-300" />
        <div className="h-4 w-4/5 bg-foreground/20 rounded animate-pulse delay-75" />
        <div className="h-4 w-3/5 bg-foreground/20 rounded animate-pulse delay-150" />
      </div>

      {/* Cursor 1 */}
      <motion.div
        animate={{
          x: [20, 150, 80, 200, 20],
          y: [40, 100, 200, 50, 40],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-0 z-20"
      >
        <MousePointer2 className="w-5 h-5 text-blue-500 fill-blue-500 stroke-[2px]" />
        <div className="px-2 py-0.5 bg-blue-500 text-white text-[10px] rounded ml-3 -mt-1 font-bold whitespace-nowrap shadow-sm">
          Alice
        </div>
      </motion.div>

      {/* Cursor 2 */}
      <motion.div
        animate={{
          x: [200, 50, 180, 40, 200],
          y: [150, 220, 80, 120, 150],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute top-0 left-0 z-20"
      >
        <MousePointer2 className="w-5 h-5 text-pink-500 fill-pink-500 stroke-[2px]" />
        <div className="px-2 py-0.5 bg-pink-500 text-white text-[10px] rounded ml-3 -mt-1 font-bold whitespace-nowrap shadow-sm">
          Bob
        </div>
      </motion.div>

       {/* Cursor 3 */}
      <motion.div
        animate={{
          x: [100, 220, 40, 150, 100],
          y: [200, 40, 150, 200, 200],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-0 left-0 z-20"
      >
        <MousePointer2 className="w-5 h-5 text-yellow-500 fill-yellow-500 stroke-[2px]" />
        <div className="px-2 py-0.5 bg-yellow-500 text-black text-[10px] rounded ml-3 -mt-1 font-bold whitespace-nowrap shadow-sm">
          Charlie
        </div>
      </motion.div>
    </div>
  );
}

function ChatDemo() {
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'me' | 'other'}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    const sequence = [
      { text: "Hey! Is this chat secure?", sender: 'other', delay: 500 },
      { text: "Yes, E2E encrypted. Nothing stored.", sender: 'me', delay: 1500 },
      { text: "Awesome! Sending the key now.", sender: 'other', delay: 3000 },
      { text: "🔒 ******************", sender: 'other', delay: 4000 },
    ] as const;

    let timeouts: NodeJS.Timeout[] = [];
    
    // Loop the sequence
    const runSequence = () => {
      setMessages([]);
      let totalDelay = 0;
      sequence.forEach((msg, i) => {
        totalDelay += msg.delay;
        const t = setTimeout(() => {
          setMessages(prev => [...prev, { id: i, text: msg.text, sender: msg.sender }]);
        }, totalDelay);
        timeouts.push(t);
      });
      
      const resetT = setTimeout(runSequence, totalDelay + 3000);
      timeouts.push(resetT);
    };

    runSequence();
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full max-w-md bg-card rounded-xl border border-primary/20 shadow-2xl overflow-hidden flex flex-col h-[320px]">
      <div className="p-3 bg-primary/10 border-b border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold">Secure Channel #921</span>
        </div>
        <Lock className="w-4 h-4 text-primary" />
      </div>
      <div ref={scrollRef} className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-none">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.sender === 'me' ? 20 : -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className={cn(
                "max-w-[80%] p-3 rounded-2xl text-sm",
                msg.sender === 'me' 
                  ? "ml-auto bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-muted rounded-tl-sm"
              )}
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="h-8 rounded-full bg-muted border border-border/50 w-full" />
      </div>
    </div>
  );
}

// --- Main Page ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function Home() {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  const [shareId, setShareId] = useState("");

  useEffect(() => {
    setShareId(Math.random().toString(36).slice(2, 10));
  }, []);

  // Parallax effect for hero content
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-primary/30">
      
      {/* Fixed Nav Elements */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <div className="bg-background/80 backdrop-blur-md rounded-full border border-border/50 shadow-lg">
            <GitHubBadge />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <div className="bg-background/80 backdrop-blur-md rounded-full p-1 shadow-lg">
            <ThemeToggle />
          </div>
        </motion.div>
      </div>

      {/* --- HERO SECTION --- */}
      <div className="relative min-h-screen flex flex-col">
        <AuroraBackground className="flex-1">
          <motion.div 
            style={{ y: y1, opacity }}
            className="container relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4 py-20"
          >
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="flex items-center gap-4 mb-8"
            >
              <PastaLogo className="h-20 w-20 md:h-24 md:w-24 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
              <h1 className="text-6xl md:text-8xl font-bold font-righteous text-foreground tracking-tight">
                Pastaa
              </h1>
            </motion.div>

            {/* Subtitle */}
            <div className="mb-16 max-w-2xl px-4">
               <TypingTextReveal 
                 text={t('heroSubtitle')} 
                 className="text-lg md:text-2xl text-muted-foreground text-center leading-relaxed"
                 speed={0.01}
               />
            </div>

            {/* 3 Main Action Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="w-full max-w-5xl px-4"
            >
              {/* Desktop View (Tilt Cards) */}
              <div className="hidden md:grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="h-[220px]">
                  <TiltCard 
                    href="/send" 
                    icon={Send} 
                    title={t('sendButton')} 
                    description={t('sendDescription')}
                  />
                </div>
                <div className="h-[220px]">
                  <TiltCard 
                    href={shareId ? `/${shareId}` : ""} 
                    icon={Share2} 
                    title={t('shareButton')} 
                    description={t('shareDescription')}
                  />
                </div>
                <div className="h-[220px]">
                  <TiltCard 
                    href="/chat" 
                    icon={MessageSquare} 
                    title={t('chatButton')} 
                    description={t('chatDescription')}
                  />
                </div>
              </div>

              {/* Mobile View (Compact List) */}
              <div className="flex flex-col gap-4 md:hidden">
                <MobileCard 
                  href="/send" 
                  icon={Send} 
                  title="Send" 
                  description="E2E Encrypted"
                />
                <MobileCard 
                  href={shareId ? `/${shareId}` : ""} 
                  icon={Share2} 
                  title="Share" 
                  description="Real-time Collab"
                />
                <a href="https://chat.pastaa.io" className="w-full group">
                   <MobileCard 
                    href="/chat" 
                    icon={MessageSquare} 
                    title="Chat" 
                    description="E2E Group Chat"
                  />
                </a>
              </div>
            </motion.div>

            {/* Features List (Restored) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground mt-12 max-w-4xl"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span>E2E Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                <span>Syntax Highlighting</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Rich Text Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Real-time Collaboration</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Fast & Lightweight</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Mobile Friendly</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                <span>Self Hostable</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>No Registration</span>
              </div>
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-primary" />
                <span>Open Source</span>
              </div>
            </motion.div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50 z-20">
              <span className="text-xs uppercase tracking-widest">Scroll</span>
              <ChevronDown className="animate-bounce" />
            </div>

          </motion.div>
          
          {/* Gradient Overlay for smooth transition */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
        </AuroraBackground>
      </div>

      {/* --- FEATURE SECTION 1: SEND --- */}
      <section className="py-32 md:py-40 relative overflow-hidden bg-background">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-6xl mx-auto">
            <motion.div 
               variants={containerVariants}
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 space-y-6 text-center lg:text-left"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Send className="w-3 h-3" />
                Encrypted Paste
              </motion.div>
              <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-bold font-righteous">{t('demoSendTitle')}</motion.h2>
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">{t('demoSendDesc')}</motion.p>
              <motion.div variants={itemVariants}>
                <Link href="/send" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                  {t('tryItBtn')} <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
               whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 flex justify-center lg:justify-end w-full"
            >
              <SendDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FEATURE SECTION 2: SHARE --- */}
      <section className="py-32 md:py-40 relative overflow-hidden bg-muted/10">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16 max-w-6xl mx-auto">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
               whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 flex justify-center lg:justify-start w-full"
            >
              <ShareDemo />
            </motion.div>
            
            <motion.div 
               variants={containerVariants}
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 space-y-6 text-center lg:text-left"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Share2 className="w-3 h-3" />
                Real-time
              </motion.div>
              <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-bold font-righteous">{t('demoShareTitle')}</motion.h2>
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">{t('demoShareDesc')}</motion.p>
              <motion.div variants={itemVariants}>
                <Link href={shareId ? `/${shareId}` : ""} className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                  {t('tryItBtn')} <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FEATURE SECTION 2.5: COLLABORATION --- */}
      <section className="py-32 md:py-40 relative overflow-hidden bg-background">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-6xl mx-auto">
            <motion.div 
               variants={containerVariants}
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 space-y-6 text-center lg:text-left"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Users className="w-3 h-3" />
                Multiplayer
              </motion.div>
              <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-bold font-righteous">Collaborazione in Tempo Reale</motion.h2>
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">
                Vedi i cursori dei tuoi colleghi muoversi in tempo reale. Lavora insieme sullo stesso documento senza conflitti.
              </motion.p>
            </motion.div>
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, rotate: -1 }}
               whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 flex justify-center lg:justify-end w-full"
            >
              <CursorDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FEATURE SECTION 3: CHAT --- */}
      <section className="py-32 md:py-40 relative overflow-hidden bg-muted/10">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-6xl mx-auto">
            <motion.div 
               variants={containerVariants}
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 space-y-6 text-center lg:text-left"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <MessageSquare className="w-3 h-3" />
                Zero Logs
              </motion.div>
              <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-bold font-righteous">{t('demoChatTitle')}</motion.h2>
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">{t('demoChatDesc')}</motion.p>
              <motion.div variants={itemVariants}>
                <Link href="/chat" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                  {t('tryItBtn')} <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 30 }}
               whileInView={{ opacity: 1, scale: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               className="flex-1 flex justify-center lg:justify-end w-full"
            >
              <ChatDemo />
            </motion.div>
          </div>
        </div>
        
        {/* Gradient Overlay for smooth transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-muted/20 to-transparent pointer-events-none" />
      </section>

      {/* --- FEATURES GRID SECTION --- */}
      <section className="py-32 md:py-40 bg-muted/20 relative">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold font-righteous mb-4">{t('featuresTitle')}</h2>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureItem 
              index={0}
              icon={Shield}
              title={t('zeroKnowledge')}
              description={t('zeroKnowledgeDesc')}
            />
            <FeatureItem 
              index={1}
              icon={Database}
              title={t('noDatabase')}
              description={t('noDatabaseDesc')}
            />
            <FeatureItem 
              index={2}
              icon={Github}
              title={t('openSourceTitle')}
              description={t('openSourceSubtitle')}
            />
          </div>
        </div>

        {/* Gradient Overlay for smooth transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* --- DOCKER / SELF HOST SECTION --- */}
      <section className="py-48 md:py-64 relative overflow-hidden bg-background">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="container px-4 mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text Content */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex-1 text-center lg:text-left space-y-6"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Server className="w-3 h-3" />
                Self Hosted
              </motion.div>
              <motion.h2 variants={itemVariants} className="text-4xl md:text-6xl font-bold font-righteous">
                {t('deployWithDocker')}
              </motion.h2>
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">
                {t('runCommand')}
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
                <Link href="https://github.com/rstlgu/pastaa" target="_blank" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 text-black font-bold hover:opacity-90 transition-opacity">
                  <Github className="w-5 h-5" />
                  GitHub Repo
                </Link>
              </motion.div>
            </motion.div>

            {/* Terminal Visualization */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full"
            >
              <DockerTerminal />
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-border/40 py-12 bg-muted/20">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <PastaLogo className="w-6 h-6" />
              <span className="font-righteous">Pastaa</span>
              <span className="text-xs">© {new Date().getFullYear()}</span>
            </div>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-primary transition-colors">{t('termsOfService')}</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">{t('privacyPolicy')}</Link>
              <a href="https://github.com/rstlgu/pastaa" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
