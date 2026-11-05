"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const LOCALES = ["en", "fr", "pt-BR", "es", "de"] as const;
export type Locale = (typeof LOCALES)[number];

const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  "pt-BR": "Português (Brasil)",
  es: "Español",
  de: "Deutsch",
};

const en = {
  language: "Language",
  guest: "Guest",
  logout: "Log out",
  localStudioBadge: "Local Studio",
  continueLocalStudio: "Continue in Local Studio (without account)",
  multiPlatformBadge: "Twitch · Kick · YouTube Live",
  launching: "Launching…",
  engineConnected: "Engine connected",
  disconnected: "Disconnected",
  connectionFailed: "Connection failed",
  retry: "Retry",
  automationStudio: "Automation Studio",
  automationLocalRun: "Local run",
  automationStudioBody:
    "Build one live run and keep its announcement, live flow, highlights, clip review and performance review in one queue.",
  automationStage: "Run status",
  automationLiveTitle: "Live title",
  automationLiveTitlePlaceholder: "Example: Friday challenge run",
  automationSchedule: "Schedule",
  automationPlatforms: "Platforms",
  automationCreateRun: "Create live run",
  automationMissingDetails:
    "Add a live title, schedule, and at least one platform.",
  automationScheduled: "Scheduled",
  automationLiveNow: "Live now",
  automationInReview: "In review",
  automationFinished: "Finished",
  automationStartLive: "Start live",
  automationFinishLive: "Finish live",
  automationCloseReview: "Close review",
  automationReset: "Clear live run",
  automationAnnouncement: "Announcement pack",
  automationLive: "Live run",
  automationMarkers: "Highlight markers",
  automationClips: "Clip review",
  automationAnalytics: "Performance review",
  automationReady: "Ready",
  automationWaiting: "Waiting",
  automationActive: "Active",
  automationReview: "Review",
  automationComplete: "Complete",
  automationProviderNote:
    "This local queue never marks a public action as delivered. Direct publishing, official clips and analytics require each creator’s connected official account.",
  creatorTitle: "Creator Growth Toolkit",
  localOnly: "Local only",
  creatorBody: "Live planning, highlights and campaign preparation.",
  objective: "Next live objective",
  objectivePlaceholder:
    "Example: turn 5 first-time chatters into returning viewers",
  growthLoop: "Growth loop",
  before: "Before",
  after: "After",
  checkGoal: "Set one measurable goal for this live",
  checkAnnounce: "Announce the live to your real community",
  checkSegment: "Plan one moment worth clipping",
  checkClips: "Review and export your strongest moments",
  checkPublish: "Publish one platform-native short clip",
  checkReview: "Review official platform analytics",
  highlights: "Highlight markers",
  highlightsBody: "Mark timestamps now, edit the real clips later.",
  newMarkerSession: "Start a new marker session",
  momentPlaceholder: "What just happened?",
  mark: "Mark",
  noMoments: "No moments marked in this session.",
  exportCsv: "Export markers as CSV",
  resetMarkers: "Start a new marker session and clear current moments?",
  defaultMoment: "Highlight",
  announcementTitle: "Plan your next live announcement",
  announcementBody: "Local announcement drafts. Manual publishing.",
  platform: "Platform",
  topic: "Topic / reason to watch",
  dateTime: "Date, time and timezone",
  dateTimePlaceholder: "25 September, 20:00 Europe/Paris",
  channelUrl: "Channel or live URL",
  prepareDraft: "Prepare draft",
  reviewDraft: "Review and edit before sharing",
  copyDraft: "Copy reviewed draft",
  copied: "Copied. You can now publish it in your community.",
  copyUnavailable: "Copy unavailable. Select and copy the draft manually.",
  prepareError: "Unable to prepare draft.",
  missingDetails: "Add a topic and a date/time with timezone.",
  invalidUrl: "Enter a full HTTPS channel or live URL.",
  platformUrl: "Use a channel or live URL on {{platform}}.",
  liveLine: "Live on {{platform}} — {{when}}",
  callToAction: "Come chat and bring your questions!",
  diagnostics: "Local diagnostics",
  diagnosticsBody:
    "Paste an error excerpt. Analysis stays on this device and is not saved. The report contains known findings only, without raw logs or credentials.",
  backendExcerpt: "Backend error excerpt",
  analyze: "Analyze logs",
  clear: "Clear excerpt",
  copyReport: "Copy safe report",
  reportCopied: "Report copied.",
  reportCopyUnavailable: "Copy unavailable. Select the report text below.",
  localServiceLaunching: "Launching local service…",
  localServiceUnavailable:
    "Local service unavailable. Displayed metrics may be outdated.",
  localServiceWaiting: "Local service connected. Waiting for status.",
  signIn: "Sign in",
  signInBody: "Enter your credentials to access the dashboard",
  username: "Username",
  password: "Password",
  signingIn: "Signing in…",
  continueWith: "Or continue with",
  noAccount: "Don’t have an account?",
  signUp: "Sign up",
  createAccount: "Create an account",
  createAccountBody: "Register to access the workspace",
  email: "Email",
  targetChannel: "Channel",
  confirmPassword: "Confirm password",
  creating: "Creating…",
  alreadyAccount: "Already have an account?",
  passwordsMismatch: "Passwords do not match",
  genericError: "An unexpected error occurred",
} as const;

export type TranslationKey = keyof typeof en;
type Messages = Record<TranslationKey, string>;

function messageSet(overrides: Partial<Messages>): Messages {
  return { ...en, ...overrides };
}

const messages: Record<Locale, Messages> = {
  en,
  fr: messageSet({
    language: "Langue",
    guest: "Invité",
    logout: "Déconnexion",
    localStudioBadge: "Studio Local",
    continueLocalStudio: "Continuer en mode Studio Local (sans compte)",
    multiPlatformBadge: "Twitch · Kick · YouTube Live",
    launching: "Démarrage…",
    engineConnected: "Moteur connecté",
    disconnected: "Déconnecté",
    connectionFailed: "Connexion impossible",
    retry: "Réessayer",
    automationStudio: "Studio d’automatisation",
    automationLocalRun: "Flux local",
    automationStudioBody:
      "Créez un flux de live et gardez son annonce, son déroulé, ses marqueurs, sa revue de clips et son bilan au même endroit.",
    automationStage: "État du flux",
    automationLiveTitle: "Titre du live",
    automationLiveTitlePlaceholder: "Exemple : Défi du vendredi",
    automationSchedule: "Programmation",
    automationPlatforms: "Plateformes",
    automationCreateRun: "Créer le flux live",
    automationMissingDetails:
      "Ajoutez un titre, une programmation et au moins une plateforme.",
    automationScheduled: "Programmé",
    automationLiveNow: "En direct",
    automationInReview: "À réviser",
    automationFinished: "Terminé",
    automationStartLive: "Démarrer le live",
    automationFinishLive: "Terminer le live",
    automationCloseReview: "Clore la revue",
    automationReset: "Effacer le flux live",
    automationAnnouncement: "Pack d’annonce",
    automationLive: "Flux live",
    automationMarkers: "Marqueurs de temps",
    automationClips: "Revue de clips",
    automationAnalytics: "Bilan de performance",
    automationReady: "Prêt",
    automationWaiting: "En attente",
    automationActive: "Actif",
    automationReview: "À réviser",
    automationComplete: "Terminé",
    automationProviderNote:
      "Ce flux local ne marque jamais une action publique comme livrée. La publication directe, les clips officiels et les analyses nécessitent le compte officiel connecté de chaque créateur.",
    creatorTitle: "Boîte à outils de croissance",
    localOnly: "Local uniquement",
    creatorBody:
      "Planification de live, highlights et préparation de campagne.",
    objective: "Objectif du prochain live",
    objectivePlaceholder:
      "Exemple : transformer 5 nouveaux chatteurs en viewers récurrents",
    growthLoop: "Boucle de croissance",
    before: "Avant",
    after: "Après",
    checkGoal: "Définir un objectif mesurable pour ce live",
    checkAnnounce: "Annoncer le live à votre vraie communauté",
    checkSegment: "Prévoir un moment qui mérite un clip",
    checkClips: "Réviser et exporter vos meilleurs moments",
    checkPublish: "Publier un clip natif de la plateforme",
    checkReview: "Consulter les analyses officielles de la plateforme",
    highlights: "Marqueurs de temps",
    highlightsBody:
      "Marquez les timestamps maintenant, montez les vrais clips plus tard.",
    newMarkerSession: "Démarrer une nouvelle session de marqueurs",
    momentPlaceholder: "Que vient-il de se passer ?",
    mark: "Marquer",
    noMoments: "Aucun moment marqué dans cette session.",
    exportCsv: "Exporter les marqueurs en CSV",
    resetMarkers:
      "Démarrer une nouvelle session et effacer les marqueurs actuels ?",
    defaultMoment: "Moment fort",
    announcementTitle: "Planifier l’annonce de votre prochain live",
    announcementBody: "Brouillons d’annonces locaux. Publication manuelle.",
    platform: "Plateforme",
    topic: "Sujet / raison de regarder",
    dateTime: "Date, heure et fuseau",
    dateTimePlaceholder: "25 septembre, 20:00 Europe/Paris",
    channelUrl: "URL de la chaîne ou du live",
    prepareDraft: "Préparer le brouillon",
    reviewDraft: "Relire et modifier avant de partager",
    copyDraft: "Copier le brouillon relu",
    copied: "Copié. Vous pouvez maintenant le publier dans votre communauté.",
    copyUnavailable:
      "Copie indisponible. Sélectionnez et copiez le brouillon manuellement.",
    prepareError: "Impossible de préparer le brouillon.",
    missingDetails: "Ajoutez un sujet et une date/heure avec fuseau.",
    invalidUrl: "Saisissez une URL HTTPS complète de chaîne ou de live.",
    platformUrl: "Utilisez une URL de chaîne ou de live sur {{platform}}.",
    liveLine: "En direct sur {{platform}} — {{when}}",
    callToAction: "Venez discuter et apporter vos questions !",
    diagnostics: "Diagnostic local",
    diagnosticsBody:
      "Collez un extrait d’erreur. L’analyse reste sur cet appareil et n’est pas sauvegardée. Le rapport ne contient que des constats connus, sans logs bruts ni identifiants.",
    backendExcerpt: "Extrait d’erreur backend",
    analyze: "Analyser les logs",
    clear: "Effacer l’extrait",
    copyReport: "Copier le rapport sûr",
    reportCopied: "Rapport copié.",
    reportCopyUnavailable:
      "Copie indisponible. Sélectionnez le texte du rapport ci-dessous.",
    localServiceLaunching: "Démarrage du service local…",
    localServiceUnavailable:
      "Service local indisponible. Les métriques affichées peuvent être obsolètes.",
    localServiceWaiting: "Service local connecté. En attente du statut.",
    signIn: "Connexion",
    signInBody: "Saisissez vos identifiants pour accéder au tableau de bord",
    username: "Nom d’utilisateur",
    password: "Mot de passe",
    signingIn: "Connexion…",
    continueWith: "Ou continuer avec",
    noAccount: "Vous n’avez pas de compte ?",
    signUp: "Créer un compte",
    createAccount: "Créer un compte",
    createAccountBody: "Inscrivez-vous pour accéder à l’espace",
    email: "E-mail",
    targetChannel: "Chaîne",
    confirmPassword: "Confirmer le mot de passe",
    creating: "Création…",
    alreadyAccount: "Vous avez déjà un compte ?",
    passwordsMismatch: "Les mots de passe ne correspondent pas",
    genericError: "Une erreur inattendue est survenue",
  }),
  "pt-BR": messageSet({
    language: "Idioma",
    guest: "Convidado",
    logout: "Sair",
    localStudioBadge: "Estúdio Local",
    continueLocalStudio: "Continuar no Estúdio Local (sem conta)",
    multiPlatformBadge: "Twitch · Kick · YouTube Live",
    launching: "Iniciando…",
    engineConnected: "Mecanismo conectado",
    disconnected: "Desconectado",
    connectionFailed: "Falha na conexão",
    retry: "Tentar novamente",
    automationStudio: "Estúdio de automação",
    automationLocalRun: "Fluxo local",
    automationStudioBody:
      "Crie um fluxo de live e mantenha anúncio, condução ao vivo, destaques, revisão de clipes e análise em uma única fila.",
    automationStage: "Status do fluxo",
    automationLiveTitle: "Título da live",
    automationLiveTitlePlaceholder: "Exemplo: Desafio de sexta-feira",
    automationSchedule: "Agendamento",
    automationPlatforms: "Plataformas",
    automationCreateRun: "Criar fluxo de live",
    automationMissingDetails:
      "Adicione um título, agendamento e pelo menos uma plataforma.",
    automationScheduled: "Agendado",
    automationLiveNow: "Ao vivo",
    automationInReview: "Em revisão",
    automationFinished: "Concluído",
    automationStartLive: "Iniciar live",
    automationFinishLive: "Encerrar live",
    automationCloseReview: "Fechar revisão",
    automationReset: "Limpar fluxo de live",
    automationAnnouncement: "Pacote de anúncio",
    automationLive: "Fluxo de live",
    automationMarkers: "Marcadores de destaque",
    automationClips: "Revisão de clipes",
    automationAnalytics: "Análise de desempenho",
    automationReady: "Pronto",
    automationWaiting: "Aguardando",
    automationActive: "Ativo",
    automationReview: "Revisar",
    automationComplete: "Concluído",
    automationProviderNote:
      "Este fluxo local nunca marca uma ação pública como entregue. Publicação direta, clipes oficiais e análises exigem a conta oficial conectada de cada criador.",
    creatorTitle: "Kit de crescimento do criador",
    localOnly: "Somente local",
    creatorBody: "Planejamento de lives, destaques e preparação de campanha.",
    objective: "Objetivo da próxima live",
    objectivePlaceholder:
      "Exemplo: transformar 5 novos participantes do chat em espectadores recorrentes",
    growthLoop: "Ciclo de crescimento",
    before: "Antes",
    after: "Depois",
    checkGoal: "Defina uma meta mensurável para esta live",
    checkAnnounce: "Anuncie a live para sua comunidade real",
    checkSegment: "Planeje um momento que merece um clipe",
    checkClips: "Revise e exporte seus melhores momentos",
    checkPublish: "Publique um clipe nativo da plataforma",
    checkReview: "Revise as análises oficiais da plataforma",
    highlights: "Marcadores de destaque",
    highlightsBody: "Marque os tempos agora e edite os clipes reais depois.",
    newMarkerSession: "Iniciar uma nova sessão de marcadores",
    momentPlaceholder: "O que acabou de acontecer?",
    mark: "Marcar",
    noMoments: "Nenhum momento marcado nesta sessão.",
    exportCsv: "Exportar marcadores como CSV",
    resetMarkers: "Iniciar uma nova sessão e limpar os momentos atuais?",
    defaultMoment: "Destaque",
    announcementTitle: "Planeje o anúncio da sua próxima live",
    announcementBody: "Rascunhos de anúncios locais. Publicação manual.",
    platform: "Plataforma",
    topic: "Tema / motivo para assistir",
    dateTime: "Data, hora e fuso",
    dateTimePlaceholder: "25 de setembro, 20:00 Europe/Paris",
    channelUrl: "URL do canal ou live",
    prepareDraft: "Preparar rascunho",
    reviewDraft: "Revisar e editar antes de compartilhar",
    copyDraft: "Copiar rascunho revisado",
    copied: "Copiado. Agora você pode publicar na sua comunidade.",
    copyUnavailable:
      "Cópia indisponível. Selecione e copie o rascunho manualmente.",
    prepareError: "Não foi possível preparar o rascunho.",
    missingDetails: "Adicione um tema e uma data/hora com fuso.",
    invalidUrl: "Informe uma URL HTTPS completa de canal ou live.",
    platformUrl: "Use uma URL de canal ou live em {{platform}}.",
    liveLine: "Ao vivo em {{platform}} — {{when}}",
    callToAction: "Venha conversar e traga suas perguntas!",
    diagnostics: "Diagnóstico local",
    diagnosticsBody:
      "Cole um trecho de erro. A análise fica neste dispositivo e não é salva. O relatório contém apenas achados conhecidos, sem logs brutos ou credenciais.",
    backendExcerpt: "Trecho de erro do backend",
    analyze: "Analisar logs",
    clear: "Limpar trecho",
    copyReport: "Copiar relatório seguro",
    reportCopied: "Relatório copiado.",
    reportCopyUnavailable:
      "Cópia indisponível. Selecione o texto do relatório abaixo.",
    localServiceLaunching: "Iniciando serviço local…",
    localServiceUnavailable:
      "Serviço local indisponível. As métricas exibidas podem estar desatualizadas.",
    localServiceWaiting: "Serviço local conectado. Aguardando status.",
    signIn: "Entrar",
    signInBody: "Informe suas credenciais para acessar o painel",
    username: "Nome de usuário",
    password: "Senha",
    signingIn: "Entrando…",
    continueWith: "Ou continue com",
    noAccount: "Não tem uma conta?",
    signUp: "Criar conta",
    createAccount: "Criar uma conta",
    createAccountBody: "Cadastre-se para acessar o espaço",
    email: "E-mail",
    targetChannel: "Canal",
    confirmPassword: "Confirmar senha",
    creating: "Criando…",
    alreadyAccount: "Já tem uma conta?",
    passwordsMismatch: "As senhas não coincidem",
    genericError: "Ocorreu um erro inesperado",
  }),
  es: messageSet({
    language: "Idioma",
    guest: "Invitado",
    logout: "Cerrar sesión",
    localStudioBadge: "Estudio Local",
    continueLocalStudio: "Continuar en modo Estudio Local (sin cuenta)",
    multiPlatformBadge: "Twitch · Kick · YouTube Live",
    launching: "Iniciando…",
    engineConnected: "Motor conectado",
    disconnected: "Desconectado",
    connectionFailed: "Error de conexión",
    retry: "Reintentar",
    automationStudio: "Estudio de automatización",
    automationLocalRun: "Flujo local",
    automationStudioBody:
      "Crea un flujo de directo y mantén su anuncio, emisión, destacados, revisión de clips y análisis en una sola cola.",
    automationStage: "Estado del flujo",
    automationLiveTitle: "Título del directo",
    automationLiveTitlePlaceholder: "Ejemplo: Reto del viernes",
    automationSchedule: "Programación",
    automationPlatforms: "Plataformas",
    automationCreateRun: "Crear flujo de directo",
    automationMissingDetails:
      "Añade un título, una programación y al menos una plataforma.",
    automationScheduled: "Programado",
    automationLiveNow: "En directo",
    automationInReview: "En revisión",
    automationFinished: "Finalizado",
    automationStartLive: "Iniciar directo",
    automationFinishLive: "Finalizar directo",
    automationCloseReview: "Cerrar revisión",
    automationReset: "Borrar flujo de directo",
    automationAnnouncement: "Paquete de anuncio",
    automationLive: "Flujo de directo",
    automationMarkers: "Marcadores destacados",
    automationClips: "Revisión de clips",
    automationAnalytics: "Análisis de rendimiento",
    automationReady: "Listo",
    automationWaiting: "En espera",
    automationActive: "Activo",
    automationReview: "Revisar",
    automationComplete: "Completado",
    automationProviderNote:
      "Este flujo local nunca marca una acción pública como entregada. La publicación directa, los clips oficiales y las analíticas requieren la cuenta oficial conectada de cada creador.",
    creatorTitle: "Kit de crecimiento para creadores",
    localOnly: "Solo local",
    creatorBody:
      "Planificación de directos, destacados y preparación de campañas.",
    objective: "Objetivo del próximo directo",
    objectivePlaceholder:
      "Ejemplo: convertir 5 nuevos chatters en espectadores recurrentes",
    growthLoop: "Ciclo de crecimiento",
    before: "Antes",
    after: "Después",
    checkGoal: "Define un objetivo medible para este directo",
    checkAnnounce: "Anuncia el directo a tu comunidad real",
    checkSegment: "Planifica un momento que merezca un clip",
    checkClips: "Revisa y exporta tus mejores momentos",
    checkPublish: "Publica un clip nativo de la plataforma",
    checkReview: "Revisa las analíticas oficiales de la plataforma",
    highlights: "Marcadores destacados",
    highlightsBody: "Marca tiempos ahora y edita los clips reales después.",
    newMarkerSession: "Iniciar una nueva sesión de marcadores",
    momentPlaceholder: "¿Qué acaba de pasar?",
    mark: "Marcar",
    noMoments: "No hay momentos marcados en esta sesión.",
    exportCsv: "Exportar marcadores como CSV",
    resetMarkers: "¿Iniciar una nueva sesión y borrar los momentos actuales?",
    defaultMoment: "Momento destacado",
    announcementTitle: "Planifica el anuncio de tu próximo directo",
    announcementBody: "Borradores de anuncios locales. Publicación manual.",
    platform: "Plataforma",
    topic: "Tema / motivo para ver",
    dateTime: "Fecha, hora y zona horaria",
    dateTimePlaceholder: "25 de septiembre, 20:00 Europe/Paris",
    channelUrl: "URL del canal o directo",
    prepareDraft: "Preparar borrador",
    reviewDraft: "Revisar y editar antes de compartir",
    copyDraft: "Copiar borrador revisado",
    copied: "Copiado. Ahora puedes publicarlo en tu comunidad.",
    copyUnavailable:
      "Copia no disponible. Selecciona y copia el borrador manualmente.",
    prepareError: "No se pudo preparar el borrador.",
    missingDetails: "Añade un tema y una fecha/hora con zona horaria.",
    invalidUrl: "Introduce una URL HTTPS completa de canal o directo.",
    platformUrl: "Usa una URL de canal o directo en {{platform}}.",
    liveLine: "En directo en {{platform}} — {{when}}",
    callToAction: "¡Ven a chatear y trae tus preguntas!",
    diagnostics: "Diagnóstico local",
    diagnosticsBody:
      "Pega un extracto de error. El análisis permanece en este dispositivo y no se guarda. El informe solo contiene hallazgos conocidos, sin registros sin procesar ni credenciales.",
    backendExcerpt: "Extracto de error del backend",
    analyze: "Analizar registros",
    clear: "Limpiar extracto",
    copyReport: "Copiar informe seguro",
    reportCopied: "Informe copiado.",
    reportCopyUnavailable:
      "Copia no disponible. Selecciona el texto del informe de abajo.",
    localServiceLaunching: "Iniciando servicio local…",
    localServiceUnavailable:
      "Servicio local no disponible. Las métricas mostradas pueden estar desactualizadas.",
    localServiceWaiting: "Servicio local conectado. Esperando estado.",
    signIn: "Iniciar sesión",
    signInBody: "Introduce tus credenciales para acceder al panel",
    username: "Nombre de usuario",
    password: "Contraseña",
    signingIn: "Iniciando sesión…",
    continueWith: "O continúa con",
    noAccount: "¿No tienes una cuenta?",
    signUp: "Crear cuenta",
    createAccount: "Crear una cuenta",
    createAccountBody: "Regístrate para acceder al espacio",
    email: "Correo electrónico",
    targetChannel: "Canal",
    confirmPassword: "Confirmar contraseña",
    creating: "Creando…",
    alreadyAccount: "¿Ya tienes una cuenta?",
    passwordsMismatch: "Las contraseñas no coinciden",
    genericError: "Se produjo un error inesperado",
  }),
  de: messageSet({
    language: "Sprache",
    guest: "Gast",
    logout: "Abmelden",
    localStudioBadge: "Lokales Studio",
    continueLocalStudio: "Im lokalen Studio fortfahren (ohne Konto)",
    multiPlatformBadge: "Twitch · Kick · YouTube Live",
    launching: "Wird gestartet…",
    engineConnected: "Engine verbunden",
    disconnected: "Getrennt",
    connectionFailed: "Verbindung fehlgeschlagen",
    retry: "Erneut versuchen",
    automationStudio: "Automationsstudio",
    automationLocalRun: "Lokaler Ablauf",
    automationStudioBody:
      "Erstelle einen Live-Ablauf und bündele Ankündigung, Live-Flow, Highlights, Clip-Prüfung und Performance-Review in einer Warteschlange.",
    automationStage: "Ablaufstatus",
    automationLiveTitle: "Live-Titel",
    automationLiveTitlePlaceholder: "Beispiel: Freitags-Challenge",
    automationSchedule: "Zeitplan",
    automationPlatforms: "Plattformen",
    automationCreateRun: "Live-Ablauf erstellen",
    automationMissingDetails:
      "Füge einen Live-Titel, Zeitplan und mindestens eine Plattform hinzu.",
    automationScheduled: "Geplant",
    automationLiveNow: "Jetzt live",
    automationInReview: "In Prüfung",
    automationFinished: "Abgeschlossen",
    automationStartLive: "Live starten",
    automationFinishLive: "Live beenden",
    automationCloseReview: "Prüfung abschließen",
    automationReset: "Live-Ablauf löschen",
    automationAnnouncement: "Ankündigungspaket",
    automationLive: "Live-Ablauf",
    automationMarkers: "Highlight-Markierungen",
    automationClips: "Clip-Prüfung",
    automationAnalytics: "Performance-Review",
    automationReady: "Bereit",
    automationWaiting: "Wartet",
    automationActive: "Aktiv",
    automationReview: "Prüfen",
    automationComplete: "Abgeschlossen",
    automationProviderNote:
      "Dieser lokale Ablauf markiert keine öffentliche Aktion als zugestellt. Direktveröffentlichung, offizielle Clips und Analysen benötigen das verbundene offizielle Konto jedes Creators.",
    creatorTitle: "Creator-Growth-Toolkit",
    localOnly: "Nur lokal",
    creatorBody: "Live-Planung, Highlights und Kampagnenvorbereitung.",
    objective: "Ziel für den nächsten Live",
    objectivePlaceholder:
      "Beispiel: 5 neue Chat-Teilnehmer zu wiederkehrenden Zuschauern machen",
    growthLoop: "Wachstumszyklus",
    before: "Vorher",
    after: "Nachher",
    checkGoal: "Ein messbares Ziel für diesen Live festlegen",
    checkAnnounce: "Den Live deiner echten Community ankündigen",
    checkSegment: "Einen clipwürdigen Moment planen",
    checkClips: "Stärkste Momente prüfen und exportieren",
    checkPublish: "Einen plattformeigenen Kurzclip veröffentlichen",
    checkReview: "Offizielle Plattformanalysen prüfen",
    highlights: "Highlight-Markierungen",
    highlightsBody:
      "Markiere Zeitstempel jetzt und bearbeite die echten Clips später.",
    newMarkerSession: "Neue Markierungssitzung starten",
    momentPlaceholder: "Was ist gerade passiert?",
    mark: "Markieren",
    noMoments: "In dieser Sitzung sind keine Momente markiert.",
    exportCsv: "Markierungen als CSV exportieren",
    resetMarkers: "Eine neue Sitzung starten und aktuelle Momente löschen?",
    defaultMoment: "Highlight",
    announcementTitle: "Ankündigung für deinen nächsten Live planen",
    announcementBody: "Lokale Ankündigungsentwürfe. Manuelle Veröffentlichung.",
    platform: "Plattform",
    topic: "Thema / Grund zum Zuschauen",
    dateTime: "Datum, Uhrzeit und Zeitzone",
    dateTimePlaceholder: "25. September, 20:00 Europe/Paris",
    channelUrl: "Kanal- oder Live-URL",
    prepareDraft: "Entwurf vorbereiten",
    reviewDraft: "Vor dem Teilen prüfen und bearbeiten",
    copyDraft: "Geprüften Entwurf kopieren",
    copied: "Kopiert. Du kannst ihn jetzt in deiner Community veröffentlichen.",
    copyUnavailable:
      "Kopieren nicht verfügbar. Wähle den Entwurf aus und kopiere ihn manuell.",
    prepareError: "Entwurf konnte nicht vorbereitet werden.",
    missingDetails: "Füge ein Thema sowie Datum/Uhrzeit mit Zeitzone hinzu.",
    invalidUrl: "Gib eine vollständige HTTPS-Kanal- oder Live-URL ein.",
    platformUrl: "Verwende eine Kanal- oder Live-URL auf {{platform}}.",
    liveLine: "Live auf {{platform}} — {{when}}",
    callToAction: "Komm in den Chat und bring deine Fragen mit!",
    diagnostics: "Lokale Diagnose",
    diagnosticsBody:
      "Füge einen Fehlerauszug ein. Die Analyse bleibt auf diesem Gerät und wird nicht gespeichert. Der Bericht enthält nur bekannte Befunde, keine Rohlogs oder Zugangsdaten.",
    backendExcerpt: "Backend-Fehlerauszug",
    analyze: "Logs analysieren",
    clear: "Auszug löschen",
    copyReport: "Sicheren Bericht kopieren",
    reportCopied: "Bericht kopiert.",
    reportCopyUnavailable:
      "Kopieren nicht verfügbar. Wähle den Berichtstext unten aus.",
    localServiceLaunching: "Lokaler Dienst wird gestartet…",
    localServiceUnavailable:
      "Lokaler Dienst nicht verfügbar. Angezeigte Metriken können veraltet sein.",
    localServiceWaiting: "Lokaler Dienst verbunden. Warte auf Status.",
    signIn: "Anmelden",
    signInBody: "Gib deine Zugangsdaten ein, um das Dashboard zu öffnen",
    username: "Benutzername",
    password: "Passwort",
    signingIn: "Anmeldung…",
    continueWith: "Oder fortfahren mit",
    noAccount: "Noch kein Konto?",
    signUp: "Registrieren",
    createAccount: "Konto erstellen",
    createAccountBody: "Registriere dich, um den Arbeitsbereich zu öffnen",
    email: "E-Mail",
    targetChannel: "Kanal",
    confirmPassword: "Passwort bestätigen",
    creating: "Wird erstellt…",
    alreadyAccount: "Bereits ein Konto?",
    passwordsMismatch: "Die Passwörter stimmen nicht überein",
    genericError: "Ein unerwarteter Fehler ist aufgetreten",
  }),
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "velbots.locale.v1";

function browserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const candidates = navigator.languages ?? [navigator.language];

  if (candidates.some((value) => value.toLowerCase().startsWith("pt")))
    return "pt-BR";
  if (candidates.some((value) => value.toLowerCase().startsWith("fr")))
    return "fr";
  if (candidates.some((value) => value.toLowerCase().startsWith("es")))
    return "es";
  if (candidates.some((value) => value.toLowerCase().startsWith("de")))
    return "de";

  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    setLocale(
      LOCALES.includes(stored as Locale) ? (stored as Locale) : browserLocale(),
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => {
        let text = messages[locale][key];

        for (const [name, replacement] of Object.entries(values ?? {})) {
          text = text.replaceAll(`{{${name}}}`, replacement);
        }

        return text;
      },
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (!context) throw new Error("useLocale must be used within LocaleProvider");

  return context;
}

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label>
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500"
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {localeLabels[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
