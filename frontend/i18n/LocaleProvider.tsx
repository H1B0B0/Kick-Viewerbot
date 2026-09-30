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
  subtitle: "ViewerBot legacy · Creator Growth beta",
  guest: "Guest",
  logout: "Log out",
  launching: "Launching…",
  engineConnected: "Engine connected",
  disconnected: "Disconnected",
  connectionFailed: "Connection failed",
  retry: "Retry",
  betaTitle: "What this beta tests",
  betaBody:
    "A familiar ViewerBot workspace for orientation, plus live planning, creator-controlled highlight markers, CSV review exports, and announcement drafts. Publishing remains a deliberate action by the creator.",
  betaSafety: "Legacy synthetic-engagement controls are paused in this beta.",
  legacyTitle: "ViewerBot Legacy",
  migrationMode: "Migration mode",
  legacyBody:
    "The ViewerBot space remains part of V4 so your community has a clear bridge to the new product. The legacy workflow is visible here, but its synthetic-audience and proxy actions are paused.",
  legacySafety:
    "Legacy actions do not contact Kick, Twitch, or YouTube in this beta.",
  workspace: "Workspace",
  workspaceBody:
    "Keep the familiar product name and workflow context while the beta gathers feedback.",
  legacyAutomation: "Legacy automation",
  pausedForMigration: "Paused for migration",
  legacyAutomationBody:
    "No viewer, thread, or proxy operation can be started from this beta.",
  nextStep: "Next step",
  nextStepTitle: "Move the live workflow forward",
  nextStepBody:
    "Plan the live, mark strong moments, review the CSV, then publish a real platform-native clip.",
  clipsTitle: "Clip automation status",
  clipsBody:
    "This beta never claims to have created a clip until the connected platform confirms it.",
  kickClip:
    "Marker and review export only. This beta does not use a Kick clip-creation endpoint.",
  twitchClip:
    "Official clip creation needs a connected account with the clips:edit scope. The OAuth integration is not enabled in this beta.",
  youtubeClip:
    "Marker and review export only. This beta does not create YouTube clips or uploads.",
  creatorTitle: "Creator Growth Toolkit",
  localOnly: "Local only",
  creatorBody: "Build real discovery habits alongside your current workflow.",
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
  announcementBody:
    "Prepare a draft for your community, then review and publish it yourself. Works without a connected platform account. This draft is not saved after closing the page.",
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
    subtitle: "ViewerBot historique · bêta Creator Growth",
    guest: "Invité",
    logout: "Déconnexion",
    launching: "Démarrage…",
    engineConnected: "Moteur connecté",
    disconnected: "Déconnecté",
    connectionFailed: "Connexion impossible",
    retry: "Réessayer",
    betaTitle: "Ce que teste cette bêta",
    betaBody:
      "Un espace ViewerBot familier pour se repérer, avec la planification de lives, des marqueurs de temps contrôlés par le créateur, des exports CSV et des brouillons d’annonces. La publication reste une décision du créateur.",
    betaSafety:
      "Les contrôles historiques d’engagement synthétique sont en pause dans cette bêta.",
    legacyTitle: "ViewerBot historique",
    migrationMode: "Mode migration",
    legacyBody:
      "L’espace ViewerBot reste présent dans la V4 afin d’offrir à votre communauté une transition claire vers le nouveau produit. Le workflow historique est visible, mais les actions d’audience synthétique et de proxy sont en pause.",
    legacySafety:
      "Les actions historiques ne contactent ni Kick, ni Twitch, ni YouTube dans cette bêta.",
    workspace: "Espace",
    workspaceBody:
      "Conservez le nom et le contexte de workflow connus pendant que la bêta recueille les retours.",
    legacyAutomation: "Automatisation historique",
    pausedForMigration: "En pause pour la migration",
    legacyAutomationBody:
      "Aucune opération de viewers, threads ou proxy ne peut être démarrée depuis cette bêta.",
    nextStep: "Prochaine étape",
    nextStepTitle: "Faire progresser le workflow de live",
    nextStepBody:
      "Planifiez le live, marquez les meilleurs moments, révisez le CSV puis publiez un vrai clip natif.",
    clipsTitle: "État de l’automatisation des clips",
    clipsBody:
      "Cette bêta n’affirme jamais avoir créé un clip avant confirmation de la plateforme connectée.",
    kickClip:
      "Marqueurs et export de revue uniquement. Cette bêta n’utilise pas d’endpoint de création de clips Kick.",
    twitchClip:
      "La création officielle de clips nécessite un compte connecté avec le scope clips:edit. L’intégration OAuth n’est pas active dans cette bêta.",
    youtubeClip:
      "Marqueurs et export de revue uniquement. Cette bêta ne crée ni clips ni uploads YouTube.",
    creatorTitle: "Boîte à outils de croissance",
    localOnly: "Local uniquement",
    creatorBody:
      "Développez de vraies habitudes de découverte en parallèle de votre workflow actuel.",
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
    announcementBody:
      "Préparez un brouillon pour votre communauté, puis relisez-le et publiez-le vous-même. Fonctionne sans compte de plateforme connecté. Ce brouillon n’est pas conservé après fermeture de la page.",
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
    subtitle: "ViewerBot legado · beta Creator Growth",
    guest: "Convidado",
    logout: "Sair",
    launching: "Iniciando…",
    engineConnected: "Mecanismo conectado",
    disconnected: "Desconectado",
    connectionFailed: "Falha na conexão",
    retry: "Tentar novamente",
    betaTitle: "O que esta beta testa",
    betaBody:
      "Um espaço ViewerBot familiar para orientação, além de planejamento de lives, marcadores controlados pelo criador, exportações CSV e rascunhos de anúncios. A publicação continua sendo uma decisão do criador.",
    betaSafety:
      "Os controles legados de engajamento sintético estão pausados nesta beta.",
    legacyTitle: "ViewerBot legado",
    migrationMode: "Modo de migração",
    legacyBody:
      "O espaço ViewerBot continua na V4 para dar à sua comunidade uma ponte clara para o novo produto. O fluxo legado está visível, mas as ações de audiência sintética e proxy estão pausadas.",
    legacySafety:
      "As ações legadas não contatam Kick, Twitch ou YouTube nesta beta.",
    workspace: "Espaço",
    workspaceBody:
      "Mantenha o nome e o contexto de trabalho conhecidos enquanto a beta coleta feedback.",
    legacyAutomation: "Automação legada",
    pausedForMigration: "Pausada para migração",
    legacyAutomationBody:
      "Nenhuma operação de viewers, threads ou proxy pode ser iniciada nesta beta.",
    nextStep: "Próximo passo",
    nextStepTitle: "Avance o fluxo da live",
    nextStepBody:
      "Planeje a live, marque momentos fortes, revise o CSV e publique um clipe nativo real.",
    clipsTitle: "Status da automação de clipes",
    clipsBody:
      "Esta beta nunca afirma ter criado um clipe até a plataforma conectada confirmar.",
    kickClip:
      "Somente marcadores e exportação para revisão. Esta beta não usa um endpoint de criação de clipes Kick.",
    twitchClip:
      "A criação oficial de clipes exige uma conta conectada com o escopo clips:edit. A integração OAuth não está ativa nesta beta.",
    youtubeClip:
      "Somente marcadores e exportação para revisão. Esta beta não cria clipes ou uploads do YouTube.",
    creatorTitle: "Kit de crescimento do criador",
    localOnly: "Somente local",
    creatorBody: "Crie hábitos reais de descoberta junto com seu fluxo atual.",
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
    announcementBody:
      "Prepare um rascunho para sua comunidade, depois revise e publique você mesmo. Funciona sem uma conta de plataforma conectada. Este rascunho não é salvo após fechar a página.",
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
    subtitle: "ViewerBot heredado · beta Creator Growth",
    guest: "Invitado",
    logout: "Cerrar sesión",
    launching: "Iniciando…",
    engineConnected: "Motor conectado",
    disconnected: "Desconectado",
    connectionFailed: "Error de conexión",
    retry: "Reintentar",
    betaTitle: "Qué prueba esta beta",
    betaBody:
      "Un espacio ViewerBot conocido para orientarse, además de planificación de directos, marcadores controlados por el creador, exportaciones CSV y borradores de anuncios. La publicación sigue siendo una decisión del creador.",
    betaSafety:
      "Los controles heredados de interacción sintética están pausados en esta beta.",
    legacyTitle: "ViewerBot heredado",
    migrationMode: "Modo de migración",
    legacyBody:
      "El espacio ViewerBot sigue en V4 para dar a tu comunidad un puente claro hacia el nuevo producto. El flujo heredado es visible, pero las acciones de audiencia sintética y proxy están pausadas.",
    legacySafety:
      "Las acciones heredadas no contactan Kick, Twitch ni YouTube en esta beta.",
    workspace: "Espacio",
    workspaceBody:
      "Mantén el nombre y el contexto de trabajo conocidos mientras la beta recopila comentarios.",
    legacyAutomation: "Automatización heredada",
    pausedForMigration: "Pausada para la migración",
    legacyAutomationBody:
      "No se puede iniciar ninguna operación de viewers, hilos o proxy desde esta beta.",
    nextStep: "Siguiente paso",
    nextStepTitle: "Avanza el flujo del directo",
    nextStepBody:
      "Planifica el directo, marca buenos momentos, revisa el CSV y publica un clip nativo real.",
    clipsTitle: "Estado de la automatización de clips",
    clipsBody:
      "Esta beta nunca afirma haber creado un clip hasta que la plataforma conectada lo confirme.",
    kickClip:
      "Solo marcadores y exportación para revisión. Esta beta no usa un endpoint de creación de clips de Kick.",
    twitchClip:
      "La creación oficial de clips necesita una cuenta conectada con el alcance clips:edit. La integración OAuth no está habilitada en esta beta.",
    youtubeClip:
      "Solo marcadores y exportación para revisión. Esta beta no crea clips ni cargas de YouTube.",
    creatorTitle: "Kit de crecimiento para creadores",
    localOnly: "Solo local",
    creatorBody:
      "Crea hábitos reales de descubrimiento junto a tu flujo actual.",
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
    announcementBody:
      "Prepara un borrador para tu comunidad, después revísalo y publícalo tú mismo. Funciona sin una cuenta de plataforma conectada. Este borrador no se guarda al cerrar la página.",
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
    subtitle: "ViewerBot Altbestand · Creator-Growth-Beta",
    guest: "Gast",
    logout: "Abmelden",
    launching: "Wird gestartet…",
    engineConnected: "Engine verbunden",
    disconnected: "Getrennt",
    connectionFailed: "Verbindung fehlgeschlagen",
    retry: "Erneut versuchen",
    betaTitle: "Was diese Beta testet",
    betaBody:
      "Ein vertrauter ViewerBot-Bereich zur Orientierung sowie Live-Planung, vom Creator gesteuerte Highlight-Markierungen, CSV-Exporte und Ankündigungsentwürfe. Die Veröffentlichung bleibt eine bewusste Entscheidung des Creators.",
    betaSafety:
      "Historische Controls für synthetisches Engagement sind in dieser Beta pausiert.",
    legacyTitle: "ViewerBot Altbestand",
    migrationMode: "Migrationsmodus",
    legacyBody:
      "Der ViewerBot-Bereich bleibt Teil von V4, damit deine Community eine klare Brücke zum neuen Produkt hat. Der alte Workflow ist sichtbar, aber synthetische Zuschauer- und Proxy-Aktionen sind pausiert.",
    legacySafety:
      "Alte Aktionen kontaktieren in dieser Beta weder Kick noch Twitch oder YouTube.",
    workspace: "Arbeitsbereich",
    workspaceBody:
      "Behalte den vertrauten Produktnamen und Workflow-Kontext, während die Beta Feedback sammelt.",
    legacyAutomation: "Alte Automatisierung",
    pausedForMigration: "Für Migration pausiert",
    legacyAutomationBody:
      "In dieser Beta kann keine Viewer-, Thread- oder Proxy-Operation gestartet werden.",
    nextStep: "Nächster Schritt",
    nextStepTitle: "Den Live-Workflow voranbringen",
    nextStepBody:
      "Plane den Live, markiere starke Momente, prüfe die CSV und veröffentliche einen echten plattformeigenen Clip.",
    clipsTitle: "Status der Clip-Automatisierung",
    clipsBody:
      "Diese Beta behauptet nie, einen Clip erstellt zu haben, bevor die verbundene Plattform dies bestätigt.",
    kickClip:
      "Nur Markierungen und Prüfexport. Diese Beta nutzt keinen Kick-Endpunkt zum Erstellen von Clips.",
    twitchClip:
      "Die offizielle Clip-Erstellung benötigt ein verbundenes Konto mit dem Scope clips:edit. Die OAuth-Integration ist in dieser Beta nicht aktiv.",
    youtubeClip:
      "Nur Markierungen und Prüfexport. Diese Beta erstellt keine YouTube-Clips oder Uploads.",
    creatorTitle: "Creator-Growth-Toolkit",
    localOnly: "Nur lokal",
    creatorBody:
      "Entwickle echte Discovery-Gewohnheiten neben deinem aktuellen Workflow.",
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
    announcementBody:
      "Bereite einen Entwurf für deine Community vor, prüfe ihn und veröffentliche ihn selbst. Funktioniert ohne verbundenes Plattformkonto. Dieser Entwurf wird nach dem Schließen der Seite nicht gespeichert.",
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
    <label className="sr-only">
      {t("language")}
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
