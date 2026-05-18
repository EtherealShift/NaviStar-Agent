import { motion } from "framer-motion";
import { Globe, Zap, Brain, Sparkles } from "lucide-react";
import { useRef, useEffect } from "react";
import type { ChatMode } from "@/types";

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
  isNetwork: boolean;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
}

const SUGGESTIONS_FAST = [
  "帮我写一段 Python 代码",
  "解释一下量子计算的基本原理",
  "用中文翻译这段英文",
  "推荐几本好书",
];

const SUGGESTIONS_THINKING = [
  "分析一下全球气候变化的趋势",
  "比较 React 和 Vue 的架构差异",
  "论证人工智能是否具备创造力",
  "设计一个高并发系统架构方案",
];

const SUGGESTIONS_NETWORK = [
  "今天北京天气怎么样？",
  "最新的 AI 领域新闻",
  "上海和广州哪个更热？",
  "2026年世界杯在哪里举办？",
];

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.parentElement?.clientWidth ?? window.innerWidth;
    let h = canvas.parentElement?.clientHeight ?? window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const PARTICLE_COUNT = 50;
    const CONNECTION_DIST = 130;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.06;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(75, 159, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(75, 159, 255, ${p.alpha})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      w = canvas.parentElement?.clientWidth ?? window.innerWidth;
      h = canvas.parentElement?.clientHeight ?? window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function WelcomeScreen({ onSuggestionClick, isNetwork, chatMode, setChatMode }: WelcomeScreenProps) {
  const suggestions = isNetwork
    ? SUGGESTIONS_NETWORK
    : chatMode === "thinking"
    ? SUGGESTIONS_THINKING
    : SUGGESTIONS_FAST;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 relative">
      <ParticleCanvas />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center max-w-xl relative z-10"
      >
        <motion.div variants={itemVariants} className="mb-4 flex justify-center">
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: chatMode === "thinking"
                ? "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)"
                : "linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)",
              boxShadow: chatMode === "thinking"
                ? "0 0 30px rgba(168, 85, 247, 0.2)"
                : "0 0 30px rgba(75, 159, 255, 0.2)",
            }}
            animate={{
              boxShadow: chatMode === "thinking"
                ? ["0 0 20px rgba(168, 85, 247, 0.15)", "0 0 35px rgba(168, 85, 247, 0.3)", "0 0 20px rgba(168, 85, 247, 0.15)"]
                : ["0 0 20px rgba(75, 159, 255, 0.15)", "0 0 35px rgba(75, 159, 255, 0.3)", "0 0 20px rgba(75, 159, 255, 0.15)"],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={24} className="text-white" />
          </motion.div>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-2xl font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          你好，有什么可以帮你的？
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-sm mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          选择模式开始对话
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="inline-flex items-center rounded-xl overflow-hidden mb-8"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setChatMode("fast")}
            className="relative flex items-center gap-1.5 px-4 py-2.5 text-sm transition-all duration-200"
            style={{
              color: chatMode === "fast" ? "#fff" : "var(--text-secondary)",
            }}
          >
            {chatMode === "fast" && (
              <motion.div
                layoutId="modeBg"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)",
                }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <motion.div
              className="relative z-10 flex items-center gap-1.5"
              animate={chatMode === "fast" ? {
                filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"],
                scale: [1, 1.05, 1],
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap size={16} />
              <span className="font-medium">快速对话</span>
            </motion.div>
          </button>
          <button
            onClick={() => setChatMode("thinking")}
            className="relative flex items-center gap-1.5 px-4 py-2.5 text-sm transition-all duration-200"
            style={{
              color: chatMode === "thinking" ? "#fff" : "var(--text-secondary)",
            }}
          >
            {chatMode === "thinking" && (
              <motion.div
                layoutId="modeBg"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <motion.div
              className="relative z-10 flex items-center gap-1.5"
              animate={chatMode === "thinking" ? {
                filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"],
                scale: [1, 1.05, 1],
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Brain size={16} />
              <span className="font-medium">深度思考</span>
            </motion.div>
          </button>
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5">
          {suggestions.map((text, i) => (
            <motion.button
              key={`${chatMode}-${isNetwork}-${i}`}
              variants={itemVariants}
              onClick={() => onSuggestionClick(text)}
              className="group text-left px-4 py-3.5 rounded-xl text-[13px] transition-all duration-200 border hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
            >
              {isNetwork && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] mb-1.5 font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  <Globe size={10} />
                  {chatMode === "fast" ? "快速" : "深度"}搜索
                </span>
              )}
              <span className="block leading-relaxed">{text}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
