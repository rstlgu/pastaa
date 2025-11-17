"use client";

import { motion } from "framer-motion";
import { Coffee, Copy, Check, Bitcoin, Wallet } from "lucide-react";
import { PastaLogo } from "@/components/pasta-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { GitHubBadge } from "@/components/github-badge";
import Link from "next/link";
import { useState } from "react";

export default function DonatePage() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const cryptoAddresses = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      address: "bc1qg9zvj8dkvzklleygzmrzvygetaymqvj89js5je",
      icon: Bitcoin,
    },
    {
      name: "EVM",
      symbol: "ETH",
      address: "0xD3c557e6f36C606b8b067CDeB9723061f62C291e",
      icon: Wallet,
    },
    {
      name: "Solana",
      symbol: "SOL",
      address: "9BQiv9dCY15GuU1fYoiF8P5VDFXWJtvUAXHqvFZ3oiSW",
      icon: Wallet,
    },
  ];

  const copyToClipboard = (address: string, name: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(name);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-primary/20 bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <PastaLogo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-righteous">Pastaa</span>
          </Link>
          <div className="flex items-center gap-2">
            <GitHubBadge />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Title */}
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <Coffee className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold">Support me with a coffee</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Se ti piace Pastaa e vuoi supportare il progetto, considera di fare una donazione. 
              Ogni contributo è molto apprezzato e aiuta a mantenere il servizio gratuito e open source.
            </p>
          </div>

          {/* Crypto Addresses */}
          <div className="space-y-6">
            {cryptoAddresses.map((crypto, index) => (
              <motion.div
                key={crypto.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-card border-2 border-primary/20 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <crypto.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{crypto.name}</h2>
                    <p className="text-sm text-muted-foreground">{crypto.symbol}</p>
                  </div>
                </div>

                {crypto.address ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-3 border-2">
                      <p className="flex-1 font-mono text-sm break-all">
                        {crypto.address}
                      </p>
                      <button
                        onClick={() => copyToClipboard(crypto.address, crypto.symbol)}
                        className="flex-shrink-0 hover:bg-primary/10 h-10 w-10 rounded-md flex items-center justify-center transition-colors"
                      >
                        {copiedAddress === crypto.symbol ? (
                          <Check className="h-5 w-5 text-primary" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Indirizzo in arrivo...</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Thank you message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-8"
          >
            <p className="text-muted-foreground">
              Grazie per il tuo supporto! 🙏
            </p>
          </motion.div>

          {/* Back Link */}
          <div className="pt-8 text-center">
            <Link 
              href="/" 
              className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-2"
            >
              ← Torna alla home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

