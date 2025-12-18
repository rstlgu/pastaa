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
    saved: 'Salvato',
    
    // Homepage
    appName: 'Pastaa',
    appTagline: 'Condivisione testo sicura con crittografia end-to-end',
    textPlaceholder: 'Inserisci il testo...',
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
    
    // GitHub Badge
    openSourceTitle: 'Open Source & Self-Hostable',
    openSourceSubtitle: 'Codice verificabile e distribuibile',
    openSourceCodeTitle: 'Codice Open Source',
    openSourceCodeDesc: 'Ispeziona ogni riga di codice per verificare la sicurezza. Nessuna backdoor, tutto è trasparente.',
    selfHostableTitle: 'Self-Hostable',
    selfHostableDesc: 'Fai facilmente self-hosting della tua istanza personale. Pieno controllo sui tuoi dati.',
    
    // Editor Mode Change
    changeModeTitle: 'Cambiare modalità?',
    changeModeDescription: 'Hai del contenuto nella modalità corrente. Se cambi modalità, questo contenuto verrà cancellato. Vuoi continuare?',
    continueAction: 'Continua',
    
    // Editor Modes
    codeMode: 'Modalità Codice',
    docsMode: 'Modalità Documenti',
    languageLabel: 'Linguaggio',
    
    // Public Page
    publicPageWarning: 'Pagina pubblica: chiunque conosce l\'URL può visualizzare e modificare questo contenuto',
    linkCopied: 'Link copiato',
    
    // Content Duration
    contentDuration: 'Durata contenuto',
    contentDurationDescription: 'Il contenuto verrà distrutto dopo questo periodo',
    duration1Hour: '1 ora',
    duration6Hours: '6 ore',
    duration24Hours: '24 ore',
    duration7Days: '7 giorni',
    duration30Days: '30 giorni',
    expiresIn: 'Scade tra',
    expired: 'Scaduto',
    never: 'Mai',
    defaultExpiration: 'Scadenza predefinita: 24 ore',
    day: 'giorno',
    days: 'giorni',
    hour: 'ora',
    hours: 'ore',
    minute: 'minuto',
    minutes: 'minuti',
    expirationSettings: 'Scadenza Contenuto',
    expirationDate: 'Data scadenza',
    timeRemaining: 'Tempo rimanente',
    changeExpiration: 'Cambia scadenza',
    onlyCreatorCanChange: 'Solo chi ha creato la pagina può modificare la scadenza',
    noExpiration: 'Nessuna scadenza impostata',
    close: 'Chiudi',
    save: 'Salva',
    
    // Homepage
    heroTitle: 'Condivisione Testo Sicura',
    heroSubtitle: 'Condividi testo e codice in modo sicuro e invia messaggi cifrati con un editor open source',
    sendButton: 'Invia',
    shareButton: 'Condividi',
    chatButton: 'Chat',
    sendDescription: 'Messaggistica cifrata E2E e trasferimento file',
    shareDescription: 'Collabora in tempo reale su codice e documenti',
    // chatDescription: 'Chat di gruppo sicura, senza log e senza database',
    
    // Landing Sections (New)
    featuresTitle: 'Perché scegliere Pastaa',
    noDatabase: 'Nessun Database',
    noDatabaseDesc: 'I dati sono nel link, non sui nostri server',
    deployWithDocker: 'Deploy con Docker',
    runCommand: 'Avvia la tua istanza in secondi',
    
    demoSendTitle: 'Invia Messaggi Cifrati',
    demoSendDesc: 'Scrivi il tuo testo, cifralo localmente e condividi il link. La chiave di decifrazione è nel fragment (#) dell\'URL, quindi il server non la vede mai.',
    demoShareTitle: 'Condivisione Testo e Codice',
    demoShareDesc: 'Editor in tempo reale con syntax highlighting per oltre 10 linguaggi. Perfetto per condividere snippet di codice o lavorare su documenti insieme.',
    demoChatTitle: 'Chat Anonima e Sicura',
    demoChatDesc: 'Crea stanze "usa e getta". Nessuna registrazione, nessun log. I messaggi sono cifrati end-to-end e vivono solo nella memoria RAM.',
    tryItBtn: 'Provalo ora',
    encryptBtn: 'Cifra',
    decryptBtn: 'Decifra',
    
    // Footer
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Termini di Servizio',
    about: 'Chi Siamo',
    contact: 'Contatti',
    
    // Chat
    chatTitle: 'Chat Sicura',
    chatDescription: 'Chat di gruppo sicura, senza log e senza database.',
    channelName: 'Nome Canale',
    channelPassword: 'Password Canale',
    yourUsername: 'Il Tuo Username',
    joinChannel: 'Entra nel Canale',
    connecting: 'Connessione...',
    typeMessage: 'Scrivi un messaggio...',
    messagesEncrypted: 'I messaggi sono crittografati end-to-end',
    members: 'Membri',
    you: 'tu',
    leaveChannel: 'Esci dal Canale',
    copyInviteLink: 'Copia link invito',
    tripleEncryption: 'Tripla Crittografia',
    groupChat: 'Chat di Gruppo',
    realTime: 'Tempo Reale',
    zeroKnowledgeChat: 'Zero Knowledge',
    nothingStoredEver: 'Nulla viene salvato',
    e2eWithEachMember: 'E2E con ogni membro',
    serverCantRead: 'Il server non può leggere',
    passwordNeverLeaves: 'La password non lascia mai il tuo dispositivo',
  },
  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    ok: 'Ok',
    cancel: 'Cancel',
    copy: 'Copy',
    copied: 'Copied!',
    saved: 'Saved',
    
    // Homepage
    appName: 'Pastaa',
    appTagline: 'An open source editor for text/code sharing and message sending with end-to-end encryption',
    textPlaceholder: 'Enter text...',
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
    
    // GitHub Badge
    openSourceTitle: 'Open Source & Self-Hostable',
    openSourceSubtitle: 'Verifiable and distributable code',
    openSourceCodeTitle: 'Open Source Code',
    openSourceCodeDesc: 'Inspect every line of code to verify security. No backdoors, everything is transparent.',
    selfHostableTitle: 'Self-Hostable',
    selfHostableDesc: 'Easily self-host your personal instance. Full control over your data.',
    
    // Editor Mode Change
    changeModeTitle: 'Change mode?',
    changeModeDescription: 'You have content in the current mode. If you change mode, this content will be deleted. Do you want to continue?',
    continueAction: 'Continue',
    
    // Editor Modes
    codeMode: 'Code Mode',
    docsMode: 'Docs Mode',
    languageLabel: 'Language',
    
    // Public Page
    publicPageWarning: 'Public page: anyone with the URL can view and edit this content',
    linkCopied: 'Link copied',
    
    // Content Duration
    contentDuration: 'Content Duration',
    contentDurationDescription: 'Content will be destroyed after this period',
    duration1Hour: '1 hour',
    duration6Hours: '6 hours',
    duration24Hours: '24 hours',
    duration7Days: '7 days',
    duration30Days: '30 days',
    expiresIn: 'Expires in',
    expired: 'Expired',
    never: 'Never',
    defaultExpiration: 'Default expiration: 24 hours',
    day: 'day',
    days: 'days',
    hour: 'hour',
    hours: 'hours',
    minute: 'minute',
    minutes: 'minutes',
    expirationSettings: 'Content Expiration',
    expirationDate: 'Expiration date',
    timeRemaining: 'Time remaining',
    changeExpiration: 'Change expiration',
    onlyCreatorCanChange: 'Only the page creator can change the expiration',
    noExpiration: 'No expiration set',
    close: 'Close',
    save: 'Save',
    
    // Homepage
    heroTitle: 'Secure Text Sharing',
    heroSubtitle: 'An online code editor and end-to-end encrypted text sharing system',
    sendButton: 'Send',
    shareButton: 'Share',
    chatButton: 'Chat',
    sendDescription: 'E2E encrypted messaging and file transfer',
    shareDescription: 'Collaborate on code and documents in real-time',
    // chatDescription: 'Secure group chat, no logs, no database',
    
    // Landing Sections (New)
    featuresTitle: 'Why Choose Pastaa',
    noDatabase: 'No Database',
    noDatabaseDesc: 'Data lives in the link, not on our servers',
    deployWithDocker: 'Deploy with Docker',
    runCommand: 'Get your instance running in seconds',
    
    demoSendTitle: 'Send Encrypted Messages',
    demoSendDesc: 'Write your text, encrypt it locally, and share the link. The decryption key is in the URL fragment (#), so the server never sees it.',
    demoShareTitle: 'Code & Text Collaboration',
    demoShareDesc: 'Real-time editor with syntax highlighting for over 10 languages. Perfect for sharing code snippets or working on documents together.',
    demoChatTitle: 'Anonymous and Secure Chat',
    demoChatDesc: 'Create disposable rooms. No registration, no logs. Messages are end-to-end encrypted and live only in RAM.',
    tryItBtn: 'Try it now',
    encryptBtn: 'Encrypt',
    decryptBtn: 'Decrypt',
    
    // Footer
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    about: 'About',
    contact: 'Contact',
    
    // Chat
    chatTitle: 'Secure Chat',
    chatDescription: 'End-to-end encrypted group chat. No DB. No logs.',
    channelName: 'Channel Name',
    channelPassword: 'Channel Password',
    yourUsername: 'Your Username',
    joinChannel: 'Join Secure Channel',
    connecting: 'Connecting...',
    typeMessage: 'Type a message...',
    messagesEncrypted: 'Messages are end-to-end encrypted',
    members: 'Members',
    you: 'you',
    leaveChannel: 'Leave Channel',
    copyInviteLink: 'Copy invite link',
    tripleEncryption: 'Triple Encryption',
    groupChat: 'Group Chat',
    realTime: 'Real-time',
    zeroKnowledgeChat: 'Zero Knowledge',
    nothingStoredEver: 'Nothing stored ever',
    e2eWithEachMember: 'E2E with each member',
    serverCantRead: 'Server can\'t read',
    passwordNeverLeaves: 'Password never leaves your device',
  }
};

export type TranslationKey = keyof typeof translations.it;
