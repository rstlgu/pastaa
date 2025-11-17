"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeatureBadgeProps {
  feature: 'burn' | 'password' | 'expiry';
  show: boolean;
  onClose: () => void;
}

const featureInfo = {
  burn: {
    icon: Flame,
    title: 'Burn After Reading',
    description: 'Il destinatario dovrà passare il mouse sul testo per rivelarlo. Dopo la lettura completa, il messaggio verrà eliminato automaticamente.',
  },
  password: {
    icon: Lock,
    title: 'Password Protection',
    description: 'Aggiungi un secondo livello di sicurezza. Il destinatario dovrà inserire la password per decifrare il messaggio.',
  },
  expiry: {
    icon: Clock,
    title: 'Scadenza',
    description: 'Il link scadrà automaticamente dopo il tempo selezionato. Dopo la scadenza, il messaggio non sarà più accessibile.',
  },
};

export function FeatureBadge({ feature, show, onClose }: FeatureBadgeProps) {
  const info = featureInfo[feature];
  const Icon = info.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-0 right-0 z-50 px-4"
        >
          <div className="bg-primary text-primary-foreground rounded-xl p-4 shadow-2xl border-2 border-primary/50 backdrop-blur-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1">{info.title}</p>
                <p className="text-xs opacity-90 leading-relaxed">{info.description}</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              OK
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

