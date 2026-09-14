import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TreePine, Bot, ShieldCheck, Zap, Sun, Moon, X, LogOut, TrendingUp, FileCheck, User } from 'lucide-angular';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  Math = Math;
  TreePineIcon = TreePine; BotIcon = Bot; ShieldCheckIcon = ShieldCheck; ZapIcon = Zap;
  SunIcon = Sun; MoonIcon = Moon; XIcon = X; LogOutIcon = LogOut;
  TrendingUpIcon = TrendingUp; FileCheckIcon = FileCheck; UserIcon = User;

  isDarkMode = false;
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

  calcTrees = computed(() => Math.floor((Number(this.calcInput()) || 0) / 20));
  calcKm = computed(() => Math.floor((Number(this.calcInput()) || 0) * 1.5));
  calcRF = computed(() => (Number(this.calcInput()) || 0) * 1.12);
  ngOnInit() {
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
    this.authUnsubscribe?.();
    this.clearUserListeners();
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

  closeOnboarding() { this.showOnboarding.set(false); }
  closeModals() { this.showInvestModal.set(false); this.showSellModal.set(false); this.showBlockchainModal.set(false); }
  openLoginModal() { this.authMode.set('login'); this.showLoginModal.set(true); }

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
          balance: 0,
          investedTotal: 0,
          treesPlanted: 0,
          carbonCredits: 0,
          dataVersion: 2
        });
        return;
      }

      const data = snapshot.data();
      if (data['dataVersion'] !== 2) {
        void this.resetLegacyAccount(uid, userRef);
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
      balance: 0,
      investedTotal: 0,
      treesPlanted: 0,
      carbonCredits: 0,
      dataVersion: 2
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

  processInvestment(amountStr: string) {
    const amount = Number(amountStr);
    if (isNaN(amount) || amount < 50) { this.showToast('Valor mínimo de aporte é R$ 50,00', 'error'); return; }
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
    const qty = Number(qtyStr); const price = Number(priceStr);
    if (isNaN(qty) || qty <= 0 || qty > this.carbonCredits()) { this.showToast('Quantidade inválida ou saldo insuficiente.', 'error'); return; }
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
