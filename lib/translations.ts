export type Language = 'it' | 'en';

export const translations = {
  it: {
    // Common
    loading: 'Caricamento...',
    error: 'Errore',
    ok: 'Ok',
    cancel: 'Annulla',
    copy: 'Copia',
    copied: 'Copiato!',
    
    // Homepage
    appName: 'Pastaa',
    appTagline: 'Condivisione testo sicura con crittografia end-to-end',
    textPlaceholder: 'Inserisci il testo da cifrare...',
    encryptAndShare: 'Condividi',
    encrypting: 'Cifratura...',
    
    // Options
    burnAfterReading: 'Distruggi dopo la lettura',
    burnTooltip: 'Il testo verrà eliminato dopo la prima visualizzazione',
    passwordProtection: 'Protezione con password',
    passwordTooltip: 'Richiedi una password per decifrare',
    expiration: 'Scadenza',
    expirationTooltip: 'Tempo di validità del link',
    
    // Expiration times
    oneHour: '1 ora',
    fourHours: '4 ore',
    oneDay: '1 giorno',
    sevenDays: '7 giorni',
    
    // Password
    password: 'Password',
    enterPassword: 'Inserisci password',
    passwordRequired: 'Password Richiesta',
    passwordProtectedPaste: 'Questo paste è protetto da password',
    unlock: 'Sblocca',
    wrongPassword: 'Password errata o errore di decifratura',
    
    // Link generated
    linkGenerated: 'Link Generato',
    shareLink: 'Condividi Link',
    copyLink: 'Copia Link',
    newPaste: 'Nuovo Paste',
    shareMessage: 'Leggi il mio messaggio cifrato',
    
    // View page
    decrypting: 'Decifratura in corso...',
    pasteNotFound: 'Paste non trovato',
    pasteExpired: 'Paste scaduto o già eliminato',
    loadError: 'Errore nel caricamento del paste',
    invalidLink: 'Link non valido: chiave di decifratura mancante',
    backToHome: 'Torna alla Home',
    decryptedLocally: 'Testo decifrato localmente nel tuo browser',
    
    // Burn after reading
    burnWarning: 'Attenzione: Questo testo verrà eliminato dopo la lettura',
    burnWarningMobile: 'Questo testo verrà eliminato dopo la lettura',
    revealText: 'Trascina il mouse per rivelare il testo',
    revealTextMobile: 'Trascina il dito per rivelare',
    autoDestruction: 'Autodistruzione in corso...',
    
    // E2E Badge
    e2eEncryption: 'Crittografia E2E',
    e2eFullName: 'End-to-End Encryption',
    howItWorks: 'Come Funziona',
    e2eDescription: 'Il tuo testo viene cifrato direttamente nel tuo browser prima di essere inviato al server. Questo significa che nessuno, nemmeno noi, può leggere il contenuto.',
    clientEncryption: 'Cifratura Client-Side',
    clientEncryptionDesc: 'Il testo viene cifrato nel browser con AES-256-GCM',
    keyInUrl: 'Chiave nell\'URL',
    keyInUrlDesc: 'Mai inviata al server',
    keyInUrlDescLong: 'La chiave resta nel fragment (#), mai inviata al server',
    localDecryption: 'Decifratura Locale',
    localDecryptionDesc: 'Solo nel tuo browser',
    localDecryptionDescLong: 'Solo chi ha il link può decifrare nel proprio browser',
    zeroKnowledge: 'Zero Knowledge',
    zeroKnowledgeDesc: 'Il server salva solo dati cifrati.',
    zeroKnowledgeDescLong: 'Il server salva solo dati cifrati. Nemmeno gli amministratori possono leggere il tuo testo.',
    understood: 'Ho capito',
    
    // Footer
    maxSize: 'Max 100KB',
    encryption: 'AES-256-GCM',
    
    // Errors
    errorCreating: 'Errore durante la creazione del paste',
    missingEncryptionData: 'Dati di cifratura mancanti',
    
    // GitHub
    viewSourceGitHub: 'Visualizza codice sorgente su GitHub',
  },
  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    ok: 'Ok',
    cancel: 'Cancel',
    copy: 'Copy',
    copied: 'Copied!',
    
    // Homepage
    appName: 'Pastaa',
    appTagline: 'Secure text sharing with end-to-end encryption',
    textPlaceholder: 'Enter text to encrypt...',
    encryptAndShare: 'Share',
    encrypting: 'Encrypting...',
    
    // Options
    burnAfterReading: 'Burn after reading',
    burnTooltip: 'Text will be deleted after first view',
    passwordProtection: 'Password protection',
    passwordTooltip: 'Require password to decrypt',
    expiration: 'Expiration',
    expirationTooltip: 'Link validity time',
    
    // Expiration times
    oneHour: '1 hour',
    fourHours: '4 hours',
    oneDay: '1 day',
    sevenDays: '7 days',
    
    // Password
    password: 'Password',
    enterPassword: 'Enter password',
    passwordRequired: 'Password Required',
    passwordProtectedPaste: 'This paste is password protected',
    unlock: 'Unlock',
    wrongPassword: 'Wrong password or decryption error',
    
    // Link generated
    linkGenerated: 'Link Generated',
    shareLink: 'Share Link',
    copyLink: 'Copy Link',
    newPaste: 'New Paste',
    shareMessage: 'Read my encrypted message',
    
    // View page
    decrypting: 'Decrypting...',
    pasteNotFound: 'Paste not found',
    pasteExpired: 'Paste expired or already deleted',
    loadError: 'Error loading paste',
    invalidLink: 'Invalid link: decryption key missing',
    backToHome: 'Back to Home',
    decryptedLocally: 'Text decrypted locally in your browser',
    
    // Burn after reading
    burnWarning: 'Warning: This text will be deleted after reading',
    burnWarningMobile: 'This text will be deleted after reading',
    revealText: 'Drag mouse to reveal text',
    revealTextMobile: 'Drag finger to reveal',
    autoDestruction: 'Auto-destruction in progress...',
    
    // E2E Badge
    e2eEncryption: 'E2E Encryption',
    e2eFullName: 'End-to-End Encryption',
    howItWorks: 'How It Works',
    e2eDescription: 'Your text is encrypted directly in your browser before being sent to the server. This means no one, not even us, can read the content.',
    clientEncryption: 'Client-Side Encryption',
    clientEncryptionDesc: 'Text encrypted in browser with AES-256-GCM',
    keyInUrl: 'Key in URL',
    keyInUrlDesc: 'Never sent to server',
    keyInUrlDescLong: 'Key stays in fragment (#), never sent to server',
    localDecryption: 'Local Decryption',
    localDecryptionDesc: 'Only in your browser',
    localDecryptionDescLong: 'Only those with the link can decrypt in their browser',
    zeroKnowledge: 'Zero Knowledge',
    zeroKnowledgeDesc: 'Server only stores encrypted data.',
    zeroKnowledgeDescLong: 'Server only stores encrypted data. Not even administrators can read your text.',
    understood: 'Got it',
    
    // Footer
    maxSize: 'Max 100KB',
    encryption: 'AES-256-GCM',
    
    // Errors
    errorCreating: 'Error creating paste',
    missingEncryptionData: 'Encryption data missing',
    
    // GitHub
    viewSourceGitHub: 'View source code on GitHub',
  }
};

export type TranslationKey = keyof typeof translations.it;

