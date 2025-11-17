"use client";

import { motion } from "framer-motion";
import { FileText, AlertTriangle, Shield, Ban, Gavel, Scale } from "lucide-react";
import { PastaLogo } from "@/components/pasta-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { GitHubBadge } from "@/components/github-badge";
import Link from "next/link";

export default function TermsPage() {
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
              <FileText className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold">Termini di Servizio</h1>
            </div>
            <p className="text-muted-foreground">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <p className="text-lg leading-relaxed">
              Benvenuto su Pastaa. Utilizzando il nostro servizio, accetti di rispettare i seguenti termini e condizioni. Se non sei d&apos;accordo con questi termini, ti preghiamo di non utilizzare il servizio.
            </p>
          </section>

          {/* Acceptance */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Accettazione dei Termini</h2>
            </div>
            
            <p className="text-muted-foreground">
              Accedendo e utilizzando Pastaa, accetti di essere vincolato da questi Termini di Servizio e da tutte le leggi e i regolamenti applicabili. Se non accetti questi termini, non devi utilizzare il servizio.
            </p>
          </section>

          {/* Service Description */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Descrizione del Servizio</h2>
            <p className="text-muted-foreground">
              Pastaa è un servizio di condivisione testo sicuro che consente agli utenti di:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Creare e condividere contenuti testuali tramite link</li>
              <li>Collaborare in tempo reale su documenti condivisi</li>
              <li>Utilizzare crittografia end-to-end per proteggere i contenuti</li>
              <li>Accedere al servizio senza registrazione</li>
            </ul>
          </section>

          {/* User Responsibilities */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Responsabilità dell&apos;Utente</h2>
            </div>
            
            <p className="text-muted-foreground mb-3">
              Sei responsabile di:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Utilizzare il servizio in modo legale e conforme a tutte le leggi applicabili</li>
              <li>Non condividere contenuti illegali, dannosi, offensivi o che violino i diritti di terzi</li>
              <li>Non utilizzare il servizio per attività fraudolente, spam o phishing</li>
              <li>Mantenere la riservatezza dei link condivisi e delle chiavi di crittografia</li>
              <li>Non tentare di compromettere la sicurezza del servizio o di altri utenti</li>
            </ul>
          </section>

          {/* Prohibited Content */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Contenuti Vietati</h2>
            </div>
            
            <div className="bg-destructive/10 border-2 border-destructive/20 rounded-lg p-6 space-y-3">
              <p className="font-semibold text-destructive">È vietato utilizzare Pastaa per:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Condividere contenuti illegali, diffamatori o che violino i diritti di proprietà intellettuale</li>
                <li>Distribuire malware, virus o codice dannoso</li>
                <li>Condurre attività di phishing o frode</li>
                <li>Spam o invio massivo di messaggi non richiesti</li>
                <li>Harassment, bullismo o minacce verso altri utenti</li>
                <li>Qualsiasi attività che violi le leggi locali, nazionali o internazionali</li>
              </ul>
            </div>
          </section>

          {/* Service Availability */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Disponibilità del Servizio</h2>
            </div>
            
            <p className="text-muted-foreground">
              Il servizio è fornito &quot;così com&apos;è&quot; e &quot;come disponibile&quot;. Non garantiamo che il servizio sarà ininterrotto, privo di errori o sicuro al 100%. Ci riserviamo il diritto di:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Modificare, sospendere o interrompere il servizio in qualsiasi momento senza preavviso</li>
              <li>Rimuovere contenuti che violano questi termini</li>
              <li>Limitare o bloccare l&apos;accesso a utenti che violano questi termini</li>
            </ul>
          </section>

          {/* Privacy and Security */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Privacy e Sicurezza</h2>
            <p className="text-muted-foreground">
              Sebbene Pastaa utilizzi crittografia end-to-end e misure di sicurezza avanzate, non possiamo garantire una sicurezza assoluta. Sei responsabile di:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Mantenere riservati i link di condivisione e le chiavi di crittografia</li>
              <li>Non condividere link o chiavi con persone non autorizzate</li>
              <li>Utilizzare il servizio su dispositivi e reti sicure</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Per maggiori informazioni sulla privacy, consulta la nostra <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Proprietà Intellettuale</h2>
            </div>
            
            <p className="text-muted-foreground">
              Mantieni tutti i diritti sui contenuti che condividi tramite Pastaa. Non rivendichiamo alcun diritto di proprietà sui contenuti che crei o condividi. Tuttavia, concedi a Pastaa una licenza limitata per memorizzare e trasmettere i tuoi contenuti crittografati al fine di fornire il servizio.
            </p>
            <p className="text-muted-foreground">
              Il servizio Pastaa stesso, inclusi design, logo e codice sorgente, è protetto da copyright e altre leggi sulla proprietà intellettuale.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Limitazione di Responsabilità</h2>
            <p className="text-muted-foreground">
              In nessun caso Pastaa, i suoi sviluppatori o affiliati saranno responsabili per:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Danni diretti, indiretti, incidentali o consequenziali derivanti dall&apos;uso o dall&apos;incapacità di utilizzare il servizio</li>
              <li>Perdita di dati, profitti o altre perdite commerciali</li>
              <li>Interruzioni del servizio o errori tecnici</li>
              <li>Accesso non autorizzato ai contenuti dovuto a negligenza dell&apos;utente</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              L&apos;utilizzo del servizio è a tuo rischio. Non garantiamo che il servizio soddisferà i tuoi requisiti o sarà disponibile in modo ininterrotto.
            </p>
          </section>

          {/* Indemnification */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Risarcimento</h2>
            <p className="text-muted-foreground">
              Accetti di risarcire e tenere indenne Pastaa, i suoi sviluppatori e affiliati da qualsiasi reclamo, danno, perdita, responsabilità e spesa (incluse le spese legali) derivanti dal tuo utilizzo del servizio o dalla violazione di questi termini.
            </p>
          </section>

          {/* Termination */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Risoluzione</h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di sospendere o terminare il tuo accesso al servizio immediatamente, senza preavviso, per qualsiasi motivo, incluso ma non limitato alla violazione di questi Termini di Servizio.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Modifiche ai Termini</h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di modificare questi Termini di Servizio in qualsiasi momento. Le modifiche entreranno in vigore immediatamente dopo la pubblicazione su questa pagina. È tua responsabilità rivedere periodicamente questi termini. Il continuo utilizzo del servizio dopo le modifiche costituisce l&apos;accettazione dei nuovi termini.
            </p>
          </section>

          {/* Governing Law */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Legge Applicabile</h2>
            <p className="text-muted-foreground">
              Questi Termini di Servizio sono governati e interpretati in conformità con le leggi applicabili. Qualsiasi controversia derivante da o relativa a questi termini sarà soggetta alla giurisdizione esclusiva dei tribunali competenti.
            </p>
          </section>

          {/* Severability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Separabilità</h2>
            <p className="text-muted-foreground">
              Se una qualsiasi disposizione di questi Termini di Servizio viene ritenuta non valida o inapplicabile, le restanti disposizioni rimarranno in pieno vigore ed effetto.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4 border-t border-primary/20 pt-8">
            <h2 className="text-2xl font-bold">Contatti</h2>
            <p className="text-muted-foreground">
              Per domande o chiarimenti riguardo a questi Termini di Servizio, puoi contattarci tramite il repository GitHub del progetto.
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

