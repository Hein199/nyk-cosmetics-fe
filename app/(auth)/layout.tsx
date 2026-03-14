export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{
                background:
                    "linear-gradient(135deg, #fdf0f5 0%, #fff8f0 25%, #fdf0f5 50%, #fff5fb 75%, #fdf7f0 100%)",
            }}
        >
            {/* Marble vein overlays */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(105deg, transparent 40%, rgba(212,175,55,0.07) 50%, transparent 60%),
                        linear-gradient(75deg,  transparent 30%, rgba(255,182,193,0.13) 45%, transparent 55%),
                        linear-gradient(160deg, transparent 20%, rgba(212,175,55,0.05) 40%, transparent 60%),
                        linear-gradient(40deg,  transparent 50%, rgba(255,192,203,0.10) 65%, transparent 75%)
                    `,
                }}
            />

            {/* Gold glitter sparkles */}
            {[
                { top: "8%",  left: "12%",  size: 5,  op: 0.55 },
                { top: "14%", left: "78%",  size: 4,  op: 0.45 },
                { top: "22%", left: "45%",  size: 3,  op: 0.35 },
                { top: "35%", left: "6%",   size: 6,  op: 0.5  },
                { top: "38%", left: "92%",  size: 4,  op: 0.4  },
                { top: "55%", left: "18%",  size: 3,  op: 0.3  },
                { top: "60%", left: "85%",  size: 5,  op: 0.5  },
                { top: "72%", left: "33%",  size: 4,  op: 0.4  },
                { top: "80%", left: "65%",  size: 6,  op: 0.45 },
                { top: "88%", left: "8%",   size: 3,  op: 0.35 },
                { top: "92%", left: "88%",  size: 4,  op: 0.4  },
                { top: "5%",  left: "55%",  size: 5,  op: 0.5  },
                { top: "48%", left: "52%",  size: 3,  op: 0.3  },
            ].map((s, i) => (
                <span
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                        top: s.top,
                        left: s.left,
                        width: s.size,
                        height: s.size,
                        opacity: s.op,
                        background: "radial-gradient(circle, #d4af37 0%, #f5e17a 60%, transparent 100%)",
                        borderRadius: "50%",
                        boxShadow: `0 0 ${s.size * 2}px ${s.size}px rgba(212,175,55,0.45)`,
                    }}
                />
            ))}

            {/* Soft pink blush blobs */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: "-10%", left: "-8%",
                    width: 420, height: 420,
                    borderRadius: "60% 40% 70% 30% / 50% 60% 40% 50%",
                    background: "radial-gradient(circle, rgba(255,182,193,0.35) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    bottom: "-12%", right: "-6%",
                    width: 480, height: 480,
                    borderRadius: "40% 60% 30% 70% / 60% 40% 60% 40%",
                    background: "radial-gradient(circle, rgba(255,160,180,0.28) 0%, transparent 70%)",
                    filter: "blur(50px)",
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    top: "35%", right: "8%",
                    width: 260, height: 260,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
                    filter: "blur(30px)",
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    bottom: "20%", left: "5%",
                    width: 200, height: 200,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
                    filter: "blur(25px)",
                }}
            />

            {/* Content */}
            <div className="relative z-10 w-full flex items-center justify-center px-4 py-12">
                {children}
            </div>
        </div>
    );
}
