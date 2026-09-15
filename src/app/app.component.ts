import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TreePine, Bot, ShieldCheck, Zap, Sun, Moon, X, LogOut, TrendingUp, FileCheck, User, Accessibility, TextCursorInput, PauseCircle } from 'lucide-angular';
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, Unsubscribe, updateProfile } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';

type MarketProject = {
  name: string;
  region: 'Amazônia' | 'Cerrado' | 'Mata Atlântica';
  partner: string;
  description: string;
  image: string;
  returnRate: number;
  treeGoal: number;
  minimum: number;
};

type CarbonBuyer = {
  name: string;
  commitment: string;
  demand: string;
  price: string;
  source: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly initialBalance = 67.67;
  Math = Math;
  TreePineIcon = TreePine; BotIcon = Bot; ShieldCheckIcon = ShieldCheck; ZapIcon = Zap;
  SunIcon = Sun; MoonIcon = Moon; XIcon = X; LogOutIcon = LogOut;
  TrendingUpIcon = TrendingUp; FileCheckIcon = FileCheck; UserIcon = User;
  AccessibilityIcon = Accessibility; TextCursorInputIcon = TextCursorInput; PauseCircleIcon = PauseCircle;

  isDarkMode = false;
  highContrast = signal(false);
  largeText = signal(false);
  reducedMotion = signal(false);
  private lastFocusedElement: HTMLElement | null = null;
  private readonly keydownHandler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;

    if (this.showBlockchainModal()) this.closeModals();
    else if (this.showSellModal()) this.closeModals();
    else if (this.showInvestModal()) this.closeModals();
    else if (this.showLoginModal()) this.showLoginModal.set(false);
  };

  activeTab = signal<'dashboard' | 'marketplace' | 'carteira' | 'creditos' | 'certificados' | 'perfil' | 'aprenda'>('dashboard');
  showOnboarding = signal(true);
  showLoginModal = signal(false);
  authMode = signal<'login' | 'register'>('login');
  authLoading = signal(false);
  authName = signal('');
  showInvestModal = signal(false);
  showSellModal = signal(false);
  showBlockchainModal = signal(false);

  isLoggedIn = signal(false);
  userProfile = signal({ uid: '', name: '', email: '', memberSince: '' });
  balance = signal(0);
  investedTotal = signal(0);
  treesPlanted = signal(0);
  carbonCredits = signal(0);
  marketTrend = signal<'up' | 'down' | 'stable'>('stable');
  liveChartData = signal<{value: number, isUp: boolean}[]>(this.createStableChart());
  selectedProject = signal('');
  selectedOng = signal('');
  blockchainData = signal('');
  certificates = signal<{hash: string, project: string, amount: number, date: string}[]>([]);
  toasts = signal<{id: number, message: string, type: 'success'|'error'}[]>([]);
  private toastId = 0;
  private authUnsubscribe?: Unsubscribe;
  private userUnsubscribes: Unsubscribe[] = [];
  calcInput = signal<number | string>('');
  marketSearch = signal('');
  marketRegion = signal<'Todos' | MarketProject['region']>('Todos');
  selectedQuizAnswer = signal<number | null>(null);
  quizSubmitted = signal(false);
  quizScore = signal(0);
  currentQuizIndex = signal(0);
  carbonBuyers: CarbonBuyer[] = [
    {
      name: 'Microsoft',
      commitment: 'Carbon Negative 2030',
      demand: 'Compra remoção e redução de emissões para cumprir sua meta climática.',
      price: 'Cotação sob análise',
      source: 'microsoft.com/sustainability',
    },
    {
      name: 'Salesforce',
      commitment: 'Net Zero Marketplace',
      demand: 'Conecta empresas a projetos de remoção de carbono verificados.',
      price: 'Cotação sob análise',
      source: 'salesforce.com/net-zero',
    },
    {
      name: 'Google',
      commitment: 'Net-zero até 2030',
      demand: 'Contrata soluções de remoção de carbono de alta integridade.',
      price: 'Cotação sob análise',
      source: 'sustainability.google',
    },
    {
      name: 'Shopify',
      commitment: 'Climate commitment',
      demand: 'Financia remoções permanentes por meio do Shopify Sustainability Fund.',
      price: 'Cotação sob análise',
      source: 'shopify.com/sustainability',
    },
  ];
  quizQuestions: QuizQuestion[] = [
    {
      question: 'O que representa 1 crédito de carbono?',
      options: ['1 kg de CO2 evitado', '1 tonelada de CO2e evitada ou removida', 'R$ 1 investido em uma floresta'],
      answer: 1,
      explanation: 'Um crédito representa, em geral, uma tonelada métrica de CO2 equivalente evitada ou removida.',
    },
    {
      question: 'Qual é a melhor prática ao avaliar um projeto ambiental?',
      options: ['Escolher apenas pelo maior retorno', 'Verificar impacto, metodologia e rastreabilidade', 'Investir sem ler os detalhes'],
      answer: 1,
      explanation: 'Metodologia, adicionalidade, verificação independente e rastreabilidade ajudam a avaliar a integridade do projeto.',
    },
    {
      question: 'O que acontece quando você aporta na BioCapital?',
      options: ['O valor sai do saldo e vira um registro de impacto', 'O saldo dobra automaticamente', 'Você compra ações da empresa'],
      answer: 0,
      explanation: 'O aporte reduz o saldo disponível, registra o projeto escolhido e calcula os indicadores de impacto associados.',
    },
    {
      question: 'Por que diversificar entre projetos ambientais?',
      options: ['Para distribuir riscos entre diferentes projetos e regiões', 'Para garantir lucro todos os dias', 'Para evitar acompanhar os resultados'],
      answer: 0,
      explanation: 'Diversificar ajuda a distribuir riscos ambientais, operacionais e de execução entre diferentes projetos e regiões.',
    },
    {
      question: 'O que significa retorno anual estimado?',
      options: ['Uma promessa de lucro garantido', 'Uma projeção baseada nas características do projeto', 'O valor que será descontado do saldo'],
      answer: 1,
      explanation: 'O retorno anual é uma estimativa e pode variar conforme o desempenho, o prazo e os riscos de cada projeto.',
    },
    {
      question: 'Qual informação aumenta a transparência de um crédito de carbono?',
      options: ['Uma promessa sem documentos', 'A rastreabilidade do projeto e sua verificação', 'Apenas o nome da empresa compradora'],
      answer: 1,
      explanation: 'Rastreabilidade, metodologia e verificação independente ajudam a comprovar a origem e a integridade do crédito.',
    },
    {
      question: 'O que representa a maturação de um projeto?',
      options: ['O prazo estimado para o projeto atingir seus resultados', 'A taxa cobrada em cada aporte', 'O número de acessos ao aplicativo'],
      answer: 0,
      explanation: 'A maturação indica o horizonte esperado para que o projeto desenvolva suas atividades e gere resultados.',
    },
    {
      question: 'Antes de investir, qual atitude é mais responsável?',
      options: ['Investir todo o dinheiro disponível', 'Ler os detalhes, avaliar os riscos e considerar seu objetivo', 'Escolher somente o projeto com maior percentual'],
      answer: 1,
      explanation: 'Uma decisão responsável considera objetivo, prazo, risco, liquidez e as informações disponíveis sobre o projeto.',
    },
  ];
  projects: MarketProject[] = [
    {
      name: 'Corredor Atlântico',
      region: 'Mata Atlântica',
      partner: 'Instituto Terra',
      description: 'Corredores ecológicos e espécies endêmicas.',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop',
      returnRate: 12,
      treeGoal: 20000,
      minimum: 150
    },
    {
      name: 'Projeto Amazônia Viva',
      region: 'Amazônia',
      partner: 'SOS Amazônia',
      description: 'Biodiversidade e créditos de carbono premium.',
      image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=800&auto=format&fit=crop',
      returnRate: 14,
      treeGoal: 50000,
      minimum: 100
    },
    {
      name: 'Cerrado Renascente',
      region: 'Cerrado',
      partner: 'Instituto Cerrado',
      description: 'Recuperação de nascentes e recursos hídricos.',
      image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=800&auto=format&fit=crop',
      returnRate: 11,
      treeGoal: 30000,
      minimum: 200
    },
    {
      name: 'Nascentes do Cerrado',
      region: 'Cerrado',
      partner: 'Águas do Brasil',
      description: 'Segurança hídrica e matas ciliares.',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
      returnRate: 10,
      treeGoal: 18000,
      minimum: 120
    },
    {
      name: 'Amazônia Carbono Zero',
      region: 'Amazônia',
      partner: 'Floresta Viva',
      description: 'Agrofloresta e renda para comunidades locais.',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800&auto=format&fit=crop',
      returnRate: 13,
      treeGoal: 42000,
      minimum: 180
    },
    {
      name: 'Mata Atlântica Biodiversa',
      region: 'Mata Atlântica',
      partner: 'SOS Mata Atlântica',
      description: 'Proteção de espécies ameaçadas.',
      image: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=800&auto=format&fit=crop',
      returnRate: 12,
      treeGoal: 25000,
      minimum: 160
    }
  ];

  filteredProjects = computed(() => {
    const search = this.marketSearch().trim().toLocaleLowerCase();
    const region = this.marketRegion();
    return this.projects.filter(project => {
      const matchesSearch = !search || `${project.name} ${project.partner} ${project.description}`.toLocaleLowerCase().includes(search);
      return matchesSearch && (region === 'Todos' || project.region === region);
    });
  });

  portfolioYield = computed(() => {
    return this.certificates().reduce((total, cert) => {
      const project = this.projects.find(item => item.name === cert.project);
      const annualRate = project?.returnRate ?? 0;
      return total + (cert.amount * annualRate) / 100;
    }, 0);
  });

  annualYieldRate = computed(() => {
    if (!this.investedTotal()) return 0;
    return (this.portfolioYield() / this.investedTotal()) * 100;
  });

  monthlyYield = computed(() => this.portfolioYield() / 12);
  quarterlyYield = computed(() => this.portfolioYield() / 4);
  netYield = computed(() => this.portfolioYield() * 0.82);
  projectedValue = computed(() => this.investedTotal() + this.portfolioYield());
  netMonthlyYield = computed(() => this.netYield() / 12);
  netQuarterlyYield = computed(() => this.netYield() / 4);

  investimentosAgrupados = computed(() => {
    const agrupado = new Map<string, {
      project: string;
      certificados: string[];
      valorTotal: number;
      arvoresTotal: number;
      co2Total: number;
      meta: number;
    }>();

    for (const cert of this.certificates()) {
      const projectName = cert.project;
      const metaProjeto = this.projects.find(project => project.name === projectName)?.treeGoal ?? 10000;
      const atual = agrupado.get(projectName) ?? {
        project: projectName,
        certificados: [],
        valorTotal: 0,
        arvoresTotal: 0,
        co2Total: 0,
        meta: metaProjeto
      };

      atual.certificados.push(cert.hash);
      atual.valorTotal += cert.amount;
      atual.arvoresTotal += Math.floor(cert.amount / 20);
      atual.co2Total += cert.amount / 400;
      agrupado.set(projectName, atual);
    }

    return Array.from(agrupado.values());
  });

  calcTrees = computed(() => Math.floor((Number(this.calcInput()) || 0) / 20));
  calcKm = computed(() => Math.floor((Number(this.calcInput()) || 0) * 1.5));
  calcRF = computed(() => (Number(this.calcInput()) || 0) * 1.12);
  ngOnInit() {
    this.isDarkMode = true;
    document.documentElement.classList.add('theme-dark');
    this.applyAccessibilitySettings();
    document.addEventListener('keydown', this.keydownHandler);

    this.authUnsubscribe = onAuthStateChanged(auth, user => {
      this.clearUserListeners();

      if (!user) {
        this.resetUserData();
        return;
      }

      this.isLoggedIn.set(true);
      this.userProfile.set({
        uid: user.uid,
        name: user.displayName || 'Investidor',
        email: user.email || '',
        memberSince: new Date().toLocaleDateString('pt-BR')
      });
      this.showLoginModal.set(false);
      this.listenToUserData(user.uid);
    });
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.keydownHandler);
    this.authUnsubscribe?.();
    this.clearUserListeners();
  }

  private applyAccessibilitySettings() {
    document.body.classList.toggle('a11y-high-contrast', this.highContrast());
    document.body.classList.toggle('a11y-large-text', this.largeText());
    document.body.classList.toggle('a11y-reduced-motion', this.reducedMotion());
  }

  toggleHighContrast() {
    this.highContrast.set(!this.highContrast());
    this.applyAccessibilitySettings();
    this.showToast(this.highContrast() ? 'Alto contraste ativado.' : 'Alto contraste desativado.', 'success');
  }

  toggleLargeText() {
    this.largeText.set(!this.largeText());
    this.applyAccessibilitySettings();
    this.showToast(this.largeText() ? 'Texto ampliado ativado.' : 'Texto ampliado desativado.', 'success');
  }

  toggleReducedMotion() {
    this.reducedMotion.set(!this.reducedMotion());
    this.applyAccessibilitySettings();
    this.showToast(this.reducedMotion() ? 'Redução de movimento ativada.' : 'Redução de movimento desativada.', 'success');
  }

  switchTab(tab: 'dashboard' | 'marketplace' | 'carteira' | 'creditos' | 'certificados' | 'perfil' | 'aprenda') {
    if (!['dashboard', 'marketplace'].includes(tab) && !this.isLoggedIn()) {
      this.openLoginModal();
      this.showToast('Faça login para acessar sua conta.', 'error');
      return;
    }
    this.activeTab.set(tab);
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('theme-dark', this.isDarkMode);
  }

  openModalWithFocus(modalName: 'login' | 'invest' | 'sell' | 'blockchain') {
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (modalName === 'login') this.showLoginModal.set(true);
    if (modalName === 'invest') this.showInvestModal.set(true);
    if (modalName === 'sell') this.showSellModal.set(true);
    if (modalName === 'blockchain') this.showBlockchainModal.set(true);

    setTimeout(() => {
      const modal = document.querySelector('.modal-box, .modal-overlay, .onboarding-box') as HTMLElement | null;
      const firstButton = modal?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement | null;
      if (firstButton) {
        firstButton.focus();
      }
    }, 0);
  }

  closeOnboarding() { this.showOnboarding.set(false); }
  closeModals() {
    this.showInvestModal.set(false);
    this.showSellModal.set(false);
    this.showBlockchainModal.set(false);
    this.showLoginModal.set(false);

    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }
  openLoginModal() { this.authMode.set('login'); this.openModalWithFocus('login'); }

  openRegisterModal() { this.authMode.set('register'); this.showLoginModal.set(true); }

  async processAuth(_name: string, _email: string) {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      this.showToast('Login realizado com sucesso!', 'success');
    } catch {
      this.showToast('Não foi possível realizar o login com Google.', 'error');
    }
  }

  async processEmailAuth(name: string, email: string, password: string) {
    if (!email.trim() || !password) {
      this.showToast('Informe seu e-mail e sua senha.', 'error');
      return;
    }
    if (this.authMode() === 'register' && !name.trim()) {
      this.showToast('Informe seu nome para criar a conta.', 'error');
      return;
    }
    if (password.length < 6) {
      this.showToast('A senha precisa ter pelo menos 6 caracteres.', 'error');
      return;
    }

    this.authLoading.set(true);
    try {
      if (this.authMode() === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: name.trim() });
        this.showToast('Conta criada com sucesso!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        this.showToast('Login realizado com sucesso!', 'success');
      }
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/invalid-email': 'Informe um e-mail válido.',
        'auth/weak-password': 'Escolha uma senha mais forte.'
      };
      this.showToast(messages[code] || 'Não foi possível concluir o acesso.', 'error');
    } finally {
      this.authLoading.set(false);
    }
  }

  toggleAuthMode() {
    this.authMode.update(mode => mode === 'login' ? 'register' : 'login');
  }

  async logout() {
    await signOut(auth);
    this.activeTab.set('dashboard');
    this.showToast('Você saiu da sua conta.', 'success');
  }

  private listenToUserData(uid: string) {
    const userRef = doc(db, 'users', uid);
    this.userUnsubscribes.push(onSnapshot(userRef, snapshot => {
      if (!snapshot.exists()) {
        void setDoc(userRef, {
          balance: this.initialBalance,
          investedTotal: 0,
          treesPlanted: 0,
          carbonCredits: 0,
          dataVersion: 2,
          welcomeBonus: this.initialBalance,
          welcomeBonusGranted: true,
          createdAt: new Date().toISOString()
        });
        return;
      }

      const data = snapshot.data();
      if (data['dataVersion'] !== 2) {
        void this.resetLegacyAccount(uid, userRef);
        return;
      }

      if (!data['welcomeBonusGranted']) {
        void updateDoc(userRef, {
          balance: increment(this.initialBalance),
          welcomeBonus: this.initialBalance,
          welcomeBonusGranted: true
        });
        return;
      }

      this.balance.set(data['balance'] ?? 0);
      this.investedTotal.set(data['investedTotal'] ?? 0);
      this.treesPlanted.set(data['treesPlanted'] ?? 0);
      this.carbonCredits.set(data['carbonCredits'] ?? 0);
    }, () => this.showToast('Não foi possível sincronizar sua carteira.', 'error')));

    const certificatesRef = collection(db, 'users', uid, 'certificates');
    this.userUnsubscribes.push(onSnapshot(certificatesRef, snapshot => {
      this.certificates.set(snapshot.docs.map(item => item.data() as { hash: string, project: string, amount: number, date: string }));
    }, () => this.showToast('Não foi possível carregar seus certificados.', 'error')));
  }

  private clearUserListeners() {
    this.userUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.userUnsubscribes = [];
  }

  private async resetLegacyAccount(uid: string, userRef: ReturnType<typeof doc>) {
    const certificatesRef = collection(db, 'users', uid, 'certificates');
    const certificateSnapshot = await getDocs(certificatesRef);
    await Promise.all(certificateSnapshot.docs.map(certificate => deleteDoc(certificate.ref)));
    await setDoc(userRef, {
      balance: this.initialBalance,
      investedTotal: 0,
      treesPlanted: 0,
      carbonCredits: 0,
      dataVersion: 2,
      welcomeBonus: this.initialBalance,
      welcomeBonusGranted: true
    }, { merge: true });
  }

  private resetUserData() {
    this.isLoggedIn.set(false);
    this.activeTab.set('dashboard');
    this.userProfile.set({ uid: '', name: '', email: '', memberSince: '' });
    this.balance.set(0);
    this.investedTotal.set(0);
    this.treesPlanted.set(0);
    this.carbonCredits.set(0);
    this.certificates.set([]);
    this.marketTrend.set('stable');
    this.liveChartData.set(this.createStableChart());
  }

  private createStableChart() {
    return Array.from({ length: 12 }, () => ({ value: 100, isUp: true }));
  }

  private registerTransaction(nextBalance: number, isUp: boolean) {
    const chart = this.liveChartData().slice(1);
    const simulatedChange = (Math.random() - 0.45) * 0.004;
    const simulatedValue = Math.max(nextBalance * (1 + simulatedChange), 1);
    chart.push({ value: simulatedValue, isUp: simulatedChange >= 0 });
    this.liveChartData.set(chart);
    this.marketTrend.set(isUp && simulatedChange >= 0 ? 'up' : 'down');
  }

  openInvestModal(project: string, ong: string) {
    if (!this.isLoggedIn()) { this.openLoginModal(); this.showToast('Faça login para investir em projetos.', 'error'); return; }
    this.selectedProject.set(project); this.selectedOng.set(ong); this.showInvestModal.set(true);
  }

  setMarketRegion(region: 'Todos' | MarketProject['region']) {
    this.marketRegion.set(region);
  }

  chooseQuizAnswer(index: number) {
    if (!this.quizSubmitted()) this.selectedQuizAnswer.set(index);
  }

  submitQuiz() {
    const answer = this.selectedQuizAnswer();
    if (answer === null) {
      this.showToast('Escolha uma alternativa antes de conferir.', 'error');
      return;
    }
    const currentQuestion = this.quizQuestions[this.currentQuizIndex()];
    if (answer === currentQuestion.answer) this.quizScore.update(score => score + 1);
    this.quizSubmitted.set(true);
  }

  nextQuizQuestion() {
    if (this.currentQuizIndex() < this.quizQuestions.length - 1) {
      this.currentQuizIndex.update(index => index + 1);
      this.selectedQuizAnswer.set(null);
      this.quizSubmitted.set(false);
    }
  }

  resetQuiz() {
    this.selectedQuizAnswer.set(null);
    this.quizSubmitted.set(false);
    this.quizScore.set(0);
    this.currentQuizIndex.set(0);
  }

  private sanitizeNonNegativeAmount(value: number | string, minimum: number, label: string): number | null {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed < minimum) {
      this.showToast(label, 'error');
      return null;
    }
    return parsed;
  }

  processInvestment(amountStr: string) {
    const amount = this.sanitizeNonNegativeAmount(amountStr, 50, 'Valor mínimo de aporte é R$ 50,00');
    if (amount === null) { return; }
    if (amount > this.balance()) { this.showToast('Saldo insuficiente para este aporte.', 'error'); return; }

    const uid = this.userProfile().uid;
    if (!uid) { this.openLoginModal(); return; }

    const userRef = doc(db, 'users', uid);
    void updateDoc(userRef, {
      investedTotal: increment(amount),
      balance: increment(-amount),
      treesPlanted: increment(Math.floor(amount / 20)),
      carbonCredits: increment(amount / 400)
    }).then(async () => {
      const hash = Math.random().toString(36).substring(2, 12).toUpperCase();
      await addDoc(collection(db, 'users', uid, 'certificates'), {
        hash,
        project: this.selectedProject(),
        amount,
        date: new Date().toLocaleDateString('pt-BR')
      });
      this.closeModals();
      this.registerTransaction(this.balance() - amount, false);
      this.showToast(`Aporte de R$ ${amount.toFixed(2)} processado!`, 'success');
      this.switchTab('carteira');
    }).catch(() => this.showToast('Não foi possível salvar o aporte.', 'error'));
  }

  openSellCarbonModal() { this.showSellModal.set(true); }

  processCarbonSale(qtyStr: string, priceStr: string) {
    const qty = this.sanitizeNonNegativeAmount(qtyStr, 0.01, 'Quantidade inválida ou saldo insuficiente.');
    const price = this.sanitizeNonNegativeAmount(priceStr, 0.01, 'Preço inválido para a venda.');
    if (qty === null || price === null) { return; }
    if (qty > this.carbonCredits()) { this.showToast('Quantidade inválida ou saldo insuficiente.', 'error'); return; }
    const uid = this.userProfile().uid;
    if (!uid) { this.openLoginModal(); return; }

    void updateDoc(doc(db, 'users', uid), {
      carbonCredits: increment(-qty)
    }).then(() => {
      this.closeModals();
      this.registerTransaction(this.balance(), false);
      this.showToast(`Venda de ${qty} tCO2 registrada.`, 'success');
    }).catch(() => this.showToast('Não foi possível salvar a venda.', 'error'));
  }

  openBlockchainModal(hash: string) {
    this.blockchainData.set(JSON.stringify({ network: 'Polygon PoS', contract: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', transactionHash: '0x' + Array(64).fill(0).map(() => Math.random().toString(16)[3]).join(''), certificateId: hash, timestamp: new Date().toISOString(), status: 'CONFIRMED_ON_CHAIN' }, null, 2));
    this.showBlockchainModal.set(true);
  }

  showToast(message: string, type: 'success' | 'error') {
    const id = ++this.toastId; this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update(t => t.filter(toast => toast.id !== id)), 4000);
  }

}
