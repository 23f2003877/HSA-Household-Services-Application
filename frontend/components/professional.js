// backend/static/components/professional.js
import { auth, statusClass, catIcon } from '/static/app.js';
const { ref, reactive, onMounted } = Vue;

export const ProfessionalDashboard = {
  name: 'ProfessionalDashboard',
  props: ['toast'],
  emits: ['logout'],
  setup(props, { emit }) {
    const tab = ref('dashboard');
    const loading = ref(false);
    const profile = ref(null);
    const requests = ref([]);
    const summaryData = reactive({ profile: {}, rating_buckets: {}, avg_rating: 0, status_counts: {}, total: 0 });

    // Search
    const searchQ = ref('');
    const searchResults = ref([]);

    // Chart
    const ratingsChartRef = ref(null);
    const statusChartRef = ref(null);
    let ratingsChartInst = null;
    let statusChartInst = null;

    const api = (url, opts = {}) => axios({ url, ...opts });

    // ── LOAD ──────────────────────────────────────────────────────
    async function loadDashboard() {
      loading.value = true;
      try {
        const { data } = await api('/professional/dashboard');
        profile.value = data.profile;
        // Flatten requests_by_status into array
        const flat = [];
        for (const [, reqs] of Object.entries(data.requests_by_status || {})) {
          flat.push(...reqs);
        }
        requests.value = flat.sort((a, b) => b.id - a.id);
      } finally { loading.value = false; }
    }

    async function loadRequests(status) {
      const url = status ? `/professional/requests?status=${status}` : '/professional/requests';
      const { data } = await api(url);
      requests.value = data;
    }

    async function loadSummary() {
      const { data } = await api('/professional/summary');
      Object.assign(summaryData, data);
      setTimeout(renderCharts, 200);
    }

    // ── ACTIONS ───────────────────────────────────────────────────
    async function acceptRequest(id) {
      try {
        await api(`/professional/requests/${id}/accept`, { method: 'post' });
        props.toast?.('Request accepted', 'success');
        await loadDashboard();
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Failed', 'error'); }
    }

    async function rejectRequest(id) {
      if (!confirm('Reject this request?')) return;
      try {
        await api(`/professional/requests/${id}/reject`, { method: 'post' });
        props.toast?.('Request rejected', 'success');
        await loadDashboard();
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Failed', 'error'); }
    }

    async function completeRequest(id) {
      if (!confirm('Mark this request as completed?')) return;
      try {
        await api(`/professional/requests/${id}/complete`, { method: 'post' });
        props.toast?.('Request marked completed!', 'success');
        await loadDashboard();
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Failed', 'error'); }
    }

    // ── SEARCH ────────────────────────────────────────────────────
    async function doSearch() {
      if (!searchQ.value.trim()) return;
      const { data } = await api(`/professional/search?q=${searchQ.value}`);
      searchResults.value = data;
    }

    // ── CHARTS ───────────────────────────────────────────────────
    function renderCharts() {
      if (ratingsChartRef.value) {
        if (ratingsChartInst) ratingsChartInst.destroy();
        const rb = summaryData.rating_buckets || {};
        ratingsChartInst = new Chart(ratingsChartRef.value, {
          type: 'doughnut',
          data: {
            labels: ['Positive (4-5⭐)', 'Neutral (3⭐)', 'Negative (1-2⭐)'],
            datasets: [{ data: [rb.positive || 0, rb.neutral || 0, rb.negative || 0], backgroundColor: ['#10b981','#f59e0b','#ef4444'] }]
          },
          options: { plugins: { legend: { labels: { color: '#94a3b8' } } } }
        });
      }
      if (statusChartRef.value) {
        if (statusChartInst) statusChartInst.destroy();
        const sc = summaryData.status_counts || {};
        statusChartInst = new Chart(statusChartRef.value, {
          type: 'bar',
          data: {
            labels: Object.keys(sc),
            datasets: [{ label: 'Requests', data: Object.values(sc), backgroundColor: ['#f59e0b','#10b981','#34d399','#ef4444','#6366f1'] }]
          },
          options: { scales: { y: { ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }, plugins: { legend: { labels: { color: '#94a3b8' } } } }
        });
      }
    }

    // ── PROFILE UPDATE ────────────────────────────────────────────
    async function updateProfile() {
      try {
        await api('/professional/profile', { method: 'put', data: profile.value });
        props.toast?.('Profile updated', 'success');
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Failed', 'error'); }
    }

    // ── TABS ──────────────────────────────────────────────────────
    async function goTab(t) {
      tab.value = t;
      if (t === 'dashboard') await loadDashboard();
      if (t === 'requests') await loadRequests();
      if (t === 'summary') await loadSummary();
    }

    function doLogout() { emit('logout'); }

    onMounted(() => loadDashboard());

    return {
      tab, loading, profile, requests, summaryData,
      searchQ, searchResults, ratingsChartRef, statusChartRef,
      acceptRequest, rejectRequest, completeRequest,
      doSearch, updateProfile, goTab, doLogout, statusClass, catIcon,
    };
  },
  template: `
  <div class="dash-layout">
    <!-- SIDEBAR -->
    <div class="dash-sidebar">
      <div class="sidebar-logo">🔧 Professional</div>
      <div v-for="item in sideItems" :key="item.t" class="sidebar-item" :class="{active:tab===item.t}" @click="goTab(item.t)">
        <span class="icon">{{ item.icon }}</span> {{ item.label }}
      </div>
      <div class="sidebar-divider"></div>
      <div style="padding:0 12px;font-size:11px;color:var(--text-dim)">{{ profile?.email }}</div>
      <div class="sidebar-item mt-1" @click="doLogout"><span class="icon">🚪</span> Logout</div>
    </div>

    <!-- MAIN -->
    <div class="dash-main">

      <!-- DASHBOARD TAB -->
      <div v-if="tab==='dashboard'">
        <div class="d-flex align-items-center gap-3 mb-4">
          <div class="prof-avatar" style="width:52px;height:52px;font-size:20px">{{ profile?.full_name?.[0]?.toUpperCase() }}</div>
          <div>
            <h4 style="font-weight:800;margin:0">{{ profile?.full_name }}</h4>
            <div style="font-size:13px;color:var(--text-muted)">{{ catIcon(profile?.service_type) }} {{ profile?.service_type }} · <span :class="'badge-status status-'+profile?.status">{{ profile?.status }}</span></div>
          </div>
        </div>

        <!-- Stats row -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:var(--accent3)">{{ requests.filter(r=>r.status==='requested').length }}</div><div class="stat-label">Pending</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:var(--accent)">{{ requests.filter(r=>r.status==='accepted').length }}</div><div class="stat-label">Accepted</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:var(--accent2)">{{ requests.filter(r=>r.status==='completed').length }}</div><div class="stat-label">Completed</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:#a78bfa">{{ requests.length }}</div><div class="stat-label">Total</div></div>
          </div>
        </div>

        <!-- Requests -->
        <h6 style="font-weight:700;margin-bottom:1rem">📋 All My Requests</h6>
        <div v-if="loading" class="text-center py-4"><div class="loader-ring"></div></div>
        <div v-else-if="!requests.length" class="empty-state"><div class="icon">📭</div><p>No requests yet</p></div>
        <div v-else class="table-responsive">
          <table class="table table-dark table-hover">
            <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Address</th><th>Date</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="r in requests" :key="r.id">
                <td>#{{ r.id }}</td>
                <td>{{ r.service_name }}<div style="font-size:11px;color:var(--accent)">{{ r.service_category }}</div></td>
                <td>{{ r.customer_name }}</td>
                <td style="font-size:11px;max-width:120px;overflow:hidden">{{ r.customer_address }}</td>
                <td>{{ r.date_of_request }}</td>
                <td><span :class="statusClass(r.status)">{{ r.status }}</span></td>
                <td>{{ r.rating ? '⭐'.repeat(r.rating) : '—' }}</td>
                <td>
                  <div class="d-flex gap-1 flex-wrap">
                    <button v-if="['requested','assigned'].includes(r.status)" class="btn btn-success btn-sm" @click="acceptRequest(r.id)">Accept</button>
                    <button v-if="['requested','assigned'].includes(r.status)" class="btn btn-danger btn-sm" @click="rejectRequest(r.id)">Reject</button>
                    <button v-if="r.status==='accepted'" class="btn btn-primary btn-sm" @click="completeRequest(r.id)">✅ Done</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SEARCH TAB -->
      <div v-if="tab==='search'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Search My Requests</h4>
        <div class="glass-card mb-4">
          <div class="row g-3">
            <div class="col-md-9">
              <input v-model="searchQ" class="form-control" placeholder="Search by service name or customer name…" @keyup.enter="doSearch" />
            </div>
            <div class="col-md-3"><button class="btn btn-primary w-100" @click="doSearch">Search</button></div>
          </div>
        </div>
        <div v-if="!searchResults.length" class="empty-state"><div class="icon">🔍</div><p>Enter a query to search</p></div>
        <div v-else class="table-responsive">
          <table class="table table-dark table-hover">
            <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="r in searchResults" :key="r.id">
                <td>#{{ r.id }}</td>
                <td>{{ r.service_name }}</td>
                <td>{{ r.customer_name }}</td>
                <td>{{ r.date_of_request }}</td>
                <td><span :class="statusClass(r.status)">{{ r.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SUMMARY TAB -->
      <div v-if="tab==='summary'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">My Performance</h4>
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:var(--accent3)">{{ summaryData.avg_rating?.toFixed(1) }}</div><div class="stat-label">Avg Rating</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:var(--accent2)">{{ summaryData.total }}</div><div class="stat-label">Total Requests</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:var(--accent)">{{ summaryData.rating_buckets?.positive || 0 }}</div><div class="stat-label">Positive Reviews</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-num" style="color:var(--accent4)">{{ summaryData.rating_buckets?.negative || 0 }}</div><div class="stat-label">Negative Reviews</div></div>
          </div>
        </div>
        <div class="row g-4">
          <div class="col-md-5"><div class="glass-card"><h6 style="font-weight:700;margin-bottom:1rem">Review Sentiment</h6><canvas ref="ratingsChartRef" height="200"></canvas></div></div>
          <div class="col-md-7"><div class="glass-card"><h6 style="font-weight:700;margin-bottom:1rem">Requests by Status</h6><canvas ref="statusChartRef" height="200"></canvas></div></div>
        </div>
      </div>

      <!-- PROFILE TAB -->
      <div v-if="tab==='profile'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">My Profile</h4>
        <div class="glass-card" style="max-width:520px" v-if="profile">
          <div class="mb-3"><label class="form-label">Full Name</label><input v-model="profile.full_name" class="form-control" /></div>
          <div class="mb-3"><label class="form-label">Experience</label><input v-model="profile.experience" class="form-control" /></div>
          <div class="mb-3"><label class="form-label">Address</label><input v-model="profile.address" class="form-control" /></div>
          <div class="mb-3"><label class="form-label">Pin Code</label><input v-model="profile.pincode" class="form-control" /></div>
          <div class="mb-4"><label class="form-label">About Me</label><textarea v-model="profile.description" class="form-control" rows="3"></textarea></div>
          <button class="btn btn-primary" @click="updateProfile">Save Changes</button>
        </div>
      </div>

    </div>
  </div>
  `,
  data: () => ({
    sideItems: [
      { t: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { t: 'search', icon: '🔍', label: 'Search' },
      { t: 'summary', icon: '📊', label: 'Summary' },
      { t: 'profile', icon: '👷', label: 'Profile' },
    ],
  }),
};
