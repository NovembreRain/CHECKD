'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    MapPin,
    FileText,
    Target,
    CreditCard,
    Globe,
    Lock,
    AlertTriangle,
    ShieldCheck,
    Upload,
    TrendingUp,
    DollarSign,
    Award,
    MessageCircle,
    Layers,
    Shield,
    Database,
    HelpCircle
} from 'lucide-react';

// --- DATA ---

const PLANNER_FAQS = [
    {
        question: "How is CHECKD different from just calling venues or using Google Maps?",
        answer: "Most venues on Google Maps have zero details about what they actually feel like. CHECKD's AI analyzes each venue's video walkthrough to give you real data: How's the lighting? What's the acoustics like? Is there enough accessibility? How many people actually fit? Instead of calling 20 venues hoping someone picks up, you see exactly which spaces match your event on the first try. Plus: Our semantic search understands your event naturally.",
        icon: <MapPin className="text-[#C6FF00]" size={20} />
    },
    {
        question: "What is the Intelligence Report and why should I care?",
        answer: "It's the data about each venue that nobody else provides. For every venue, you get: Vibe Score (modern? intimate?), Lighting Assessment, Acoustics check, Safety & Accessibility details, and realistic Capacity Bands. You're not guessing anymore. You know exactly what you're getting into before you book.",
        icon: <FileText className="text-[#C6FF00]" size={20} />
    },
    {
        question: "How accurate is the AI analysis?",
        answer: "Very accurate for the big things (lighting, space, basic safety). Our AI reliably detects lighting quality, room geometry, emergency exits, and ambient noise. It sometimes struggles with very specific details (like specific outlet types), which is why we built direct messaging so you can ask the owner directly.",
        icon: <Target className="text-[#C6FF00]" size={20} />
    },
    {
        question: "Can I actually book venues on CHECKD or is it just a listing site?",
        answer: "You can book completely on the platform. Request to Book → Owner notified → Message to confirm → Payment handled directly with owner. We're not charging commission right now (it's free). Owners typically respond within 24 hours.",
        icon: <CreditCard className="text-[#C6FF00]" size={20} />
    },
    {
        question: "What if I can't find my city or the venue type I need?",
        answer: "We're currently live in Mumbai, Bangalore, and Puducherry. If your city isn't listed yet, watch this space—we're expanding based on demand. Can't find your venue type? Message us. We listen to what people need.",
        icon: <Globe className="text-[#C6FF00]" size={20} />
    },
    {
        question: "Is my booking information private?",
        answer: "Yes. We don't sell your data and we don't spam you. We use your booking patterns (anonymously) to make our search smarter for everyone else. Full privacy policy available on our site.",
        icon: <Lock className="text-[#C6FF00]" size={20} />
    },
    {
        question: "What happens if the venue owner cancels on me?",
        answer: "Since payments happen directly between you and the owner, disputes are handled between you two. We recommend using payment methods with buyer protection and getting written confirmation. We can help mediate if there's a conflict.",
        icon: <AlertTriangle className="text-[#C6FF00]" size={20} />
    },
    {
        question: "How do I know venues on CHECKD are actually legitimate and safe?",
        answer: "Every venue passes an AI compliance check for fire safety, electrical safety, and emergency systems. Venues flagged as unsafe don't get listed. However, for very large events, we still recommend a personal visit.",
        icon: <ShieldCheck className="text-[#C6FF00]" size={20} />
    }
];

const OWNER_FAQS = [
    {
        question: "How do I list my venue on CHECKD? Do I need professional photos?",
        answer: "No professional photographer needed. Just upload a 1-2 minute video walk-around from your phone. Our AI analyzes it to auto-generate a professional description, tags, and a compliance report. Photos help, but the video is your heavy lifting.",
        icon: <Upload className="text-[#C6FF00]" size={20} />
    },
    {
        question: "What are these \"Optimization Suggestions\" and how do they help me?",
        answer: "After analysis, we give you custom improvements to increase bookings (e.g., \"Install warm LED panels → Add ₹15-20K/month\"). We estimate the impact on your earnings based on what event types are requesting those features.",
        icon: <TrendingUp className="text-[#C6FF00]" size={20} />
    },
    {
        question: "How much can I actually earn on CHECKD?",
        answer: "Depends on space and location. Test venues in Mumbai earn ₹50-100K/month; Bangalore rooftops ₹30-60K. Earnings depend on location, uniqueness, and how 'optimized' your space is according to our AI suggestions.",
        icon: <DollarSign className="text-[#C6FF00]" size={20} />
    },
    {
        question: "What makes CHECKD different from WedMeGood or other sites?",
        answer: "WedMeGood is a listing site with reviews. CHECKD is a venue optimization platform. We verify your space with AI data (lighting, acoustics) so planners trust it more. You get higher-quality inquiries from people who already know your vibe.",
        icon: <Award className="text-[#C6FF00]" size={20} />
    },
    {
        question: "Do I handle bookings myself or does CHECKD manage them?",
        answer: "You handle it. You get a request, message the planner, confirm details, and they pay you directly. You are in control of accepting, declining, or negotiating. Planners expect a response within 24 hours.",
        icon: <MessageCircle className="text-[#C6FF00]" size={20} />
    },
    {
        question: "Can I list multiple spaces on CHECKD?",
        answer: "Yes. Each space gets its own listing, calendar, and optimization suggestions. Your dashboard shows individual earnings per space.",
        icon: <Layers className="text-[#C6FF00]" size={20} />
    },
    {
        question: "What about insurance, liability, or damage?",
        answer: "Currently in MVP, you handle this. We recommend taking a refundable security deposit and having a clear cancellation policy. We are working on partnering with insurance companies for official liability coverage soon.",
        icon: <Shield className="text-[#C6FF00]" size={20} />
    },
    {
        question: "What does CHECKD do with my video data?",
        answer: "We use it to generate your listing, improve our AI analysis, and match you with planners. We do NOT sell your video or data, nor do we use it for marketing without permission.",
        icon: <Database className="text-[#C6FF00]" size={20} />
    }
];

// --- COMPONENT ---

interface FAQContentProps {
    initialTab?: 'planner' | 'owner';
}

export default function FAQContent({ initialTab = 'planner' }: FAQContentProps) {
    const [activeTab, setActiveTab] = useState<'planner' | 'owner'>(initialTab);
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleQuestion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const currentFaqs = activeTab === 'planner' ? PLANNER_FAQS : OWNER_FAQS;

    return (
        <div className="min-h-screen bg-[#263238] text-white pt-24 pb-20 px-6">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#C6FF00] text-xs font-bold uppercase tracking-widest mb-4">
                        <HelpCircle size={14} /> Help Center
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black">
                        Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C6FF00] to-emerald-400">Questions</span>
                    </h1>
                    <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
                        Everything you need to know about the world's first AI-powered venue marketplace.
                    </p>
                </div>

                {/* Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-[#37474F] p-1 rounded-xl flex items-center relative z-0">
                        {/* Sliding Background */}
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[#C6FF00] rounded-lg -z-10 shadow-lg"
                            initial={false}
                            animate={{
                                left: activeTab === 'planner' ? '4px' : '50%',
                                width: 'calc(50% - 4px)',
                                x: activeTab === 'planner' ? 0 : 0
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />

                        <button
                            onClick={() => setActiveTab('planner')}
                            className={`px-8 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors w-40 ${activeTab === 'planner' ? 'text-[#263238]' : 'text-gray-400 hover:text-white'}`}
                        >
                            For Planners
                        </button>
                        <button
                            onClick={() => setActiveTab('owner')}
                            className={`px-8 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors w-40 ${activeTab === 'owner' ? 'text-[#263238]' : 'text-gray-400 hover:text-white'}`}
                        >
                            For Owners
                        </button>
                    </div>
                </div>

                {/* FAQ List */}
                <div className="space-y-4">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {currentFaqs.map((faq, i) => (
                                <div
                                    key={i}
                                    className={`bg-[#37474F]/30 border ${openIndex === i ? 'border-[#C6FF00]/50 bg-[#37474F]/50' : 'border-white/5'} rounded-2xl overflow-hidden transition-all duration-300`}
                                >
                                    <button
                                        onClick={() => toggleQuestion(i)}
                                        className="w-full flex items-center justify-between p-6 text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${openIndex === i ? 'bg-[#C6FF00] text-[#263238]' : 'bg-white/5 text-gray-400'}`}>
                                                {faq.icon}
                                            </div>
                                            <span className={`font-bold text-lg ${openIndex === i ? 'text-white' : 'text-gray-300'}`}>
                                                {faq.question}
                                            </span>
                                        </div>
                                        <ChevronDown
                                            className={`text-[#C6FF00] transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    <AnimatePresence>
                                        {openIndex === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="px-6 pb-6 pl-[4.5rem] pr-12">
                                                    <p className="text-gray-400 leading-relaxed border-l-2 border-[#C6FF00]/30 pl-4">
                                                        {faq.answer}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Contact CTA */}
                <div className="mt-20 text-center bg-gradient-to-br from-[#37474F] to-[#263238] border border-white/5 p-8 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#C6FF00]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

                    <h3 className="text-xl font-bold text-white mb-2 relative z-10">Still have questions?</h3>
                    <p className="text-gray-400 mb-6 relative z-10">Our support team is available 24/7 to help you with your bookings or listings.</p>
                    <button className="px-8 py-3 bg-[#C6FF00] text-[#263238] font-bold rounded-xl hover:bg-white hover:scale-105 transition-all shadow-lg shadow-[#C6FF00]/20 relative z-10">
                        Contact Support
                    </button>
                </div>

            </div>
        </div>
    );
}
