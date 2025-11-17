"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, Cookie, Server } from "lucide-react";
import { PastaLogo } from "@/components/pasta-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { GitHubBadge } from "@/components/github-badge";
import Link from "next/link";

export default function PrivacyPage() {
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
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-muted-foreground">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <p className="text-lg leading-relaxed">
              La tua privacy è importante per noi. Questa Privacy Policy descrive come raccogliamo, utilizziamo e proteggiamo le informazioni quando utilizzi Pastaa.
            </p>
            <p className="text-muted-foreground">
              Pastaa è progettato con la privacy come priorità. Non richiediamo registrazione, non raccogliamo dati personali identificabili e utilizziamo crittografia end-to-end per proteggere i tuoi contenuti.
            </p>
          </section>

          {/* Data Collection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Raccolta delle Informazioni</h2>
            </div>
            
            <div className="space-y-3 pl-8">
              <div>
                <h3 className="font-semibold mb-2">Cosa NON raccogliamo:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Nessun dato di registrazione (email, nome, password)</li>
                  <li>Nessun dato personale identificabile</li>
                  <li>Nessun tracking degli utenti</li>
                  <li>Nessun cookie di profilazione</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Cosa raccogliamo (minimo necessario):</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Contenuti crittografati:</strong> Solo i contenuti già crittografati lato client vengono memorizzati temporaneamente sul server. Le chiavi di crittografia rimangono sempre nel tuo browser e non vengono mai inviate al server.</li>
                  <li><strong>Dati tecnici temporanei:</strong> Per la collaborazione in tempo reale, memorizziamo temporaneamente in memoria (non persistente) informazioni come posizione del cursore e presenza utenti. Questi dati vengono eliminati automaticamente dopo 10 secondi di inattività e non vengono mai salvati permanentemente.</li>
                  <li><strong>Log del server:</strong> I server possono registrare automaticamente informazioni tecniche come indirizzo IP, tipo di browser e timestamp delle richieste per scopi di sicurezza e debugging. Questi log vengono conservati per un periodo limitato.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Encryption */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Crittografia End-to-End</h2>
            </div>
            
            <div className="bg-muted/50 border-2 border-primary/20 rounded-lg p-6 space-y-3">
              <p className="text-muted-foreground">
                Pastaa utilizza crittografia <strong>AES-256-GCM</strong> per proteggere i tuoi contenuti:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Le chiavi di crittografia vengono generate nel tuo browser e <strong>non vengono mai inviate al server</strong></li>
                <li>I contenuti vengono crittografati prima di essere inviati al server</li>
                <li>Il server vede solo dati crittografati e non può leggere i contenuti</li>
                <li>La decrittografia avviene esclusivamente nel tuo browser</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Cookie className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Cookie e Tecnologie Simili</h2>
            </div>
            
            <p className="text-muted-foreground">
              Pastaa non utilizza cookie di tracciamento o profilazione. Utilizziamo solo cookie tecnici strettamente necessari per il funzionamento del servizio (ad esempio, per memorizzare le preferenze di tema scuro/chiaro localmente nel tuo browser).
            </p>
          </section>

          {/* Data Usage */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Utilizzo delle Informazioni</h2>
            </div>
            
            <p className="text-muted-foreground">
              Le informazioni raccolte vengono utilizzate esclusivamente per:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Fornire e migliorare il servizio di condivisione testo</li>
              <li>Abilitare la collaborazione in tempo reale tra utenti sulla stessa pagina</li>
              <li>Garantire la sicurezza e prevenire abusi</li>
              <li>Risolvere problemi tecnici e migliorare le prestazioni</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Condivisione delle Informazioni</h2>
            <p className="text-muted-foreground">
              Non condividiamo, vendiamo o affittiamo le tue informazioni a terze parti. I contenuti crittografati vengono memorizzati solo per permettere la condivisione tramite link e vengono eliminati automaticamente quando non più necessari.
            </p>
          </section>

          {/* Data Retention */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Conservazione dei Dati</h2>
            <p className="text-muted-foreground">
              I contenuti condivisi vengono conservati sul server solo per il tempo necessario alla condivisione. Non conserviamo copie dei contenuti dopo che sono stati eliminati. I dati di presenza per la collaborazione in tempo reale vengono eliminati immediatamente dopo 10 secondi di inattività.
            </p>
          </section>

          {/* Security */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Sicurezza</h2>
            </div>
            
            <p className="text-muted-foreground">
              Adottiamo misure di sicurezza tecniche e organizzative per proteggere i dati da accessi non autorizzati, alterazioni, divulgazioni o distruzioni. Tuttavia, nessun metodo di trasmissione su Internet o di memorizzazione elettronica è completamente sicuro al 100%.
            </p>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">I Tuoi Diritti</h2>
            <p className="text-muted-foreground">
              Poiché non raccogliamo dati personali identificabili, non abbiamo informazioni personali da condividere o eliminare. Tuttavia, hai sempre il controllo completo sui contenuti che condividi e puoi eliminarli in qualsiasi momento.
            </p>
          </section>

          {/* Changes */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Modifiche alla Privacy Policy</h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di aggiornare questa Privacy Policy. Eventuali modifiche sostanziali saranno pubblicate su questa pagina con la data dell'ultimo aggiornamento. Ti consigliamo di consultare periodicamente questa pagina per essere informato su come proteggiamo le tue informazioni.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4 border-t border-primary/20 pt-8">
            <h2 className="text-2xl font-bold">Contatti</h2>
            <p className="text-muted-foreground">
              Per domande, chiarimenti o richieste riguardo a questa Privacy Policy, puoi contattarci tramite il repository GitHub del progetto.
            </p>
          </section>

          {/* Back Link */}
          <div className="pt-8">
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

