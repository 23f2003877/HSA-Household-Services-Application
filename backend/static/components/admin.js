// backend/static/components/admin.js
import { auth, statusClass, catIcon } from '/static/app.js';
const { ref, reactive, onMounted, computed } = Vue;

export const AdminDashboard = {
  name: 'AdminDashboard',
  props: ['toast'],
  emits: ['logout'],
  setup(props, { emit }) {
    const tab = ref('dashboard');
    const loading = ref(false);

    // ── DATA ──────────────────────────────────────────────────────
    const stats = reactive({ totals: {}, recent_requests: [], pending_professionals: [] });
    const services = ref([]);
    const professionals = ref([]);
    const customers = ref([]);
    const requests = ref([]);
    const searchResults = ref([]);
    const csvTaskId = ref(null);
    const csvStatus = ref('');
    const reportTaskId = ref(null);
    const summaryData = reactive({ totals: {}, services_by_name: [], services_by_category: [], professionals_with_ratings: [] });

    // Chart refs
    const catChartRef = ref(null);
    const ratingChartRef = ref(null);
    let catChartInst = null;
    let ratingChartInst = null;

    // Service modal
    const svcForm = reactive({ id: null, name: '', description: '', base_price: '', category: '', time_required: '' });
    const svcModal = ref(null);
    const svcError = ref('');

    // Search
    const searchForm = reactive({ search_type: 'professional', search_text: '' });

    // ── API ───────────────────────────────────────────────────────
    const api = (url, opts = {}) => axios({ url, ...opts });

    async function loadDashboard() {
      loading.value = true;
      try {
        const { data } = await api('/admin/dashboard');
        Object.assign(stats, data);
      } catch { props.toast?.('Failed to load dashboard', 'error'); }
      loading.value = false;
    }

    async function loadServices() {
      const { data } = await api('/admin/services');
      services.value = data.services || [];
    }

    async function loadProfessionals() {
      const { data } = await api('/admin/professionals');
      professionals.value = data;
    }

    async function loadCustomers() {
      const { data } = await api('/admin/customers');
      customers.value = data;
    }

    async function loadRequests() {
      const { data } = await api('/admin/requests');
      requests.value = data;
    }

    async function loadSummary() {
      const { data } = await api('/admin/summary');
      Object.assign(summaryData, data);
      setTimeout(renderCharts, 200);
    }

    // ── SERVICES CRUD ─────────────────────────────────────────────
    function openNewSvc() {
      Object.assign(svcForm, { id: null, name: '', description: '', base_price: '', category: '', time_required: '' });
      svcError.value = '';
      const m = new bootstrap.Modal(document.getElementById('svcModal'));
      m.show();
    }

    function editSvc(s) {
      Object.assign(svcForm, { ...s });
      svcError.value = '';
      const m = new bootstrap.Modal(document.getElementById('svcModal'));
      m.show();
    }

    async function saveSvc() {
      svcError.value = '';
      try {
        if (svcForm.id) {
          await api(`/admin/services/${svcForm.id}`, { method: 'put', data: svcForm });
          props.toast?.('Service updated', 'success');
        } else {
          await api('/admin/services', { method: 'post', data: svcForm });
          props.toast?.('Service created', 'success');
        }
        bootstrap.Modal.getInstance(document.getElementById('svcModal'))?.hide();
        await loadServices();
      } catch (e) {
        svcError.value = e.response?.data?.msg || 'Failed to save service';
      }
    }

    async function deleteSvc(id) {
      if (!confirm('Delete this service?')) return;
      try {
        await api(`/admin/services/${id}`, { method: 'delete' });
        props.toast?.('Service deleted', 'success');
        await loadServices();
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Cannot delete', 'error'); }
    }

    // ── PROFESSIONAL ACTIONS ──────────────────────────────────────
    async function profAction(id, action) {
      try {
        await api(`/admin/professionals/${id}/action`, { method: 'post', data: { action } });
        props.toast?.(`Professional ${action}d`, 'success');
        await loadProfessionals();
        if (tab.value === 'dashboard') await loadDashboard();
      } catch { props.toast?.('Action failed', 'error'); }
    }

    async function deleteProfessional(id) {
      if (!confirm('Delete this professional permanently?')) return;
      try {
        await api(`/admin/professionals/${id}`, { method: 'delete' });
        props.toast?.('Professional deleted', 'success');
        await loadProfessionals();
      } catch { props.toast?.('Delete failed', 'error'); }
    }

    // ── CUSTOMER ACTIONS ──────────────────────────────────────────
    async function toggleCustomerBlock(c) {
      const endpoint = c.is_active ? `/admin/customers/${c.id}/block` : `/admin/customers/${c.id}/unblock`;
      try {
        await api(endpoint, { method: 'post' });
        props.toast?.(c.is_active ? 'Customer blocked' : 'Customer unblocked', 'success');
        await loadCustomers();
      } catch { props.toast?.('Action failed', 'error'); }
    }

    // ── REQUEST ACTIONS ───────────────────────────────────────────
    async function deleteRequest(id) {
      if (!confirm('Delete this request?')) return;
      await api(`/admin/requests/${id}`, { method: 'delete' });
      props.toast?.('Request deleted', 'success');
      await loadRequests();
    }

    // ── SEARCH ───────────────────────────────────────────────────
    async function doSearch() {
      try {
        const { data } = await api('/admin/search', { method: 'post', data: searchForm });
        searchResults.value = data.results || [];
      } catch { props.toast?.('Search failed', 'error'); }
    }

    // ── CSV EXPORT ────────────────────────────────────────────────
    async function triggerCsv() {
      const { data } = await api('/admin/export/csv/trigger', { method: 'post' });
      csvTaskId.value = data.task_id;
      csvStatus.value = 'pending';
      props.toast?.('CSV export started', 'info');
      pollCsv();
    }

    async function pollCsv() {
      const { data } = await api(`/admin/export/csv/status/${csvTaskId.value}`);
      if (data.ready) {
        csvStatus.value = data.result?.status === 'SUCCESS' ? 'ready' : 'failed';
        props.toast?.('CSV export ready! Click Download.', 'success');
      } else {
        csvStatus.value = 'pending';
        setTimeout(pollCsv, 2500);
      }
    }

    function downloadCsv() {
      window.open(`/admin/export/csv/download/${csvTaskId.value}`, '_blank');
    }

    async function triggerReport() {
      const { data } = await api('/admin/export/report/trigger', { method: 'post' });
      reportTaskId.value = data.task_id;
      props.toast?.('Monthly report generation started', 'info');
    }

    // ── CHARTS ───────────────────────────────────────────────────
    function renderCharts() {
      // Category chart
      if (catChartRef.value && summaryData.services_by_category?.length) {
        if (catChartInst) catChartInst.destroy();
        catChartInst = new Chart(catChartRef.value, {
          type: 'doughnut',
          data: {
            labels: summaryData.services_by_category.map(c => c.category),
            datasets: [{ data: summaryData.services_by_category.map(c => c.count), backgroundColor: ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'] }]
          },
          options: { plugins: { legend: { labels: { color: '#94a3b8' } } }, responsive: true }
        });
      }
      // Rating chart
      if (ratingChartRef.value && summaryData.professionals_with_ratings?.length) {
        if (ratingChartInst) ratingChartInst.destroy();
        ratingChartInst = new Chart(ratingChartRef.value, {
          type: 'bar',
          data: {
            labels: summaryData.professionals_with_ratings.map(p => p.name),
            datasets: [{ label: 'Avg Rating', data: summaryData.professionals_with_ratings.map(p => p.avg_rating), backgroundColor: '#10b981' }]
          },
          options: { scales: { y: { min: 0, max: 5, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }, plugins: { legend: { labels: { color: '#94a3b8' } } }, responsive: true }
        });
      }
    }

    // ── TABS ──────────────────────────────────────────────────────
    async function goTab(t) {
      tab.value = t;
      if (t === 'dashboard') await loadDashboard();
      if (t === 'services') await loadServices();
      if (t === 'professionals') await loadProfessionals();
      if (t === 'customers') await loadCustomers();
      if (t === 'requests') await loadRequests();
      if (t === 'summary') await loadSummary();
    }

    function doLogout() { emit('logout'); }

    onMounted(() => loadDashboard());

    return {
      tab, loading, stats, services, professionals, customers, requests,
      searchResults, searchForm, svcForm, svcError,
      csvTaskId, csvStatus, reportTaskId, summaryData,
      catChartRef, ratingChartRef,
      openNewSvc, editSvc, saveSvc, deleteSvc,
      profAction, deleteProfessional, toggleCustomerBlock, deleteRequest,
      doSearch, triggerCsv, pollCsv, downloadCsv, triggerReport,
      goTab, doLogout, statusClass, catIcon,
    };
  },
  template: `
  <div class="dash-layout">
    <!-- SIDEBAR -->
    <div class="dash-sidebar">
      <div class="sidebar-logo">🏠 A-Z Admin</div>
      <div v-for="item in sideItems" :key="item.t" class="sidebar-item" :class="{active: tab===item.t}" @click="goTab(item.t)">
        <span class="icon">{{ item.icon }}</span> {{ item.label }}
      </div>
      <div class="sidebar-divider"></div>
      <div class="sidebar-item" @click="doLogout"><span class="icon">🚪</span> Logout</div>
    </div>

    <!-- MAIN -->
    <div class="dash-main">
      <!-- DASHBOARD TAB -->
      <div v-if="tab==='dashboard'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Admin Dashboard</h4>
        <div v-if="loading" class="text-center py-5"><div class="loader-ring"></div></div>
        <div v-else>
          <div class="row g-3 mb-4">
            <div v-for="s in statItems" :key="s.label" class="col-6 col-md-3">
              <div class="stat-card">
                <div class="stat-num" :style="{color: s.color}">{{ stats.totals?.[s.key] ?? '…' }}</div>
                <div class="stat-label">{{ s.label }}</div>
              </div>
            </div>
          </div>

          <!-- Pending Professionals -->
          <h6 style="font-weight:700;color:var(--accent3);margin-bottom:1rem">⏳ Pending Approvals ({{ stats.pending_professionals?.length || 0 }})</h6>
          <div v-if="!stats.pending_professionals?.length" class="empty-state"><div class="icon">✅</div><p>No pending approvals</p></div>
          <div v-else class="row g-3 mb-4">
            <div v-for="p in stats.pending_professionals" :key="p.id" class="col-md-6">
              <div class="prof-card d-flex gap-3 align-items-start">
                <div class="prof-avatar">{{ p.full_name?.[0]?.toUpperCase() }}</div>
                <div class="flex-grow-1">
                  <div style="font-weight:700">{{ p.full_name }}</div>
                  <div style="font-size:12px;color:var(--text-muted)">{{ p.service_type }} · {{ p.experience }}</div>
                  <div style="font-size:11px;color:var(--text-dim)">{{ p.email }} · 📍{{ p.pincode }}</div>
                  <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-success btn-sm" @click="profAction(p.id,'approve')">Approve</button>
                    <button class="btn btn-danger btn-sm" @click="profAction(p.id,'reject')">Reject</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Requests -->
          <h6 style="font-weight:700;margin-bottom:1rem">📋 Recent Requests</h6>
          <div class="table-responsive">
            <table class="table table-dark table-hover">
              <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Professional</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="r in stats.recent_requests" :key="r.id">
                  <td>#{{ r.id }}</td>
                  <td>{{ r.service_name }}</td>
                  <td>{{ r.customer_name }}</td>
                  <td>{{ r.professional_name }}</td>
                  <td>{{ r.date_of_request }}</td>
                  <td><span :class="statusClass(r.status)">{{ r.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SERVICES TAB -->
      <div v-if="tab==='services'">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 style="font-weight:800">Services</h4>
          <button class="btn btn-primary btn-sm" @click="openNewSvc"><i class="bi bi-plus-lg me-1"></i>New Service</button>
        </div>
        <div class="row g-3">
          <div v-for="s in services" :key="s.id" class="col-md-4 col-lg-3">
            <div class="service-card">
              <div class="service-icon">{{ catIcon(s.category) }}</div>
              <div class="service-name">{{ s.name }}</div>
              <div class="service-category">{{ s.category }}</div>
              <div class="service-price">₹{{ s.base_price }}</div>
              <div class="service-time">⏱ {{ s.time_required || 'N/A' }}</div>
              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-outline-secondary btn-sm flex-grow-1" @click="editSvc(s)">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" @click="deleteSvc(s.id)">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PROFESSIONALS TAB -->
      <div v-if="tab==='professionals'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Professionals ({{ professionals.length }})</h4>
        <div class="table-responsive">
          <table class="table table-dark table-hover">
            <thead><tr><th>#</th><th>Name</th><th>Category</th><th>Pincode</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="p in professionals" :key="p.id">
                <td>{{ p.id }}</td>
                <td>{{ p.full_name }}<div style="font-size:11px;color:var(--text-dim)">{{ p.email }}</div></td>
                <td>{{ catIcon(p.service_type) }} {{ p.service_type }}</td>
                <td>{{ p.pincode }}</td>
                <td><span :class="'badge-status status-'+p.status">{{ p.status }}</span></td>
                <td>
                  <div class="d-flex gap-1 flex-wrap">
                    <button v-if="p.status==='pending'" class="btn btn-success btn-sm" @click="profAction(p.id,'approve')">Approve</button>
                    <button v-if="p.status==='pending'" class="btn btn-warning btn-sm" @click="profAction(p.id,'reject')">Reject</button>
                    <button v-if="p.status==='approved'" class="btn btn-danger btn-sm" @click="profAction(p.id,'block')">Block</button>
                    <button v-if="p.status==='blocked'" class="btn btn-success btn-sm" @click="profAction(p.id,'unblock')">Unblock</button>
                    <button class="btn btn-outline-secondary btn-sm" @click="deleteProfessional(p.id)">🗑</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CUSTOMERS TAB -->
      <div v-if="tab==='customers'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Customers ({{ customers.length }})</h4>
        <div class="table-responsive">
          <table class="table table-dark table-hover">
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Address</th><th>Pincode</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="c in customers" :key="c.id">
                <td>{{ c.id }}</td>
                <td>{{ c.full_name }}</td>
                <td style="font-size:12px">{{ c.email }}</td>
                <td style="font-size:12px">{{ c.address }}</td>
                <td>{{ c.pincode }}</td>
                <td><span :class="c.is_active ? 'badge-status status-approved' : 'badge-status status-blocked'">{{ c.is_active ? 'Active' : 'Blocked' }}</span></td>
                <td>
                  <button class="btn btn-sm" :class="c.is_active ? 'btn-danger' : 'btn-success'" @click="toggleCustomerBlock(c)">
                    {{ c.is_active ? 'Block' : 'Unblock' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- REQUESTS TAB -->
      <div v-if="tab==='requests'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">All Service Requests ({{ requests.length }})</h4>
        <div class="table-responsive">
          <table class="table table-dark table-hover">
            <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Professional</th><th>Date</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="r in requests" :key="r.id">
                <td>#{{ r.id }}</td>
                <td>{{ r.service_name }}</td>
                <td>{{ r.customer_name }}</td>
                <td>{{ r.professional_name }}</td>
                <td>{{ r.date_of_request }}</td>
                <td><span :class="statusClass(r.status)">{{ r.status }}</span></td>
                <td>{{ r.rating ? '⭐'.repeat(r.rating) : '—' }}</td>
                <td><button class="btn btn-danger btn-sm" @click="deleteRequest(r.id)">🗑</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SEARCH TAB -->
      <div v-if="tab==='search'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Search</h4>
        <div class="glass-card mb-4">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Search Type</label>
              <select v-model="searchForm.search_type" class="form-select">
                <option value="professional">Professionals</option>
                <option value="customer">Customers</option>
                <option value="service">Services</option>
                <option value="request">Requests</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Search Text</label>
              <input v-model="searchForm.search_text" class="form-control" placeholder="Enter name, category…" @keyup.enter="doSearch" />
            </div>
            <div class="col-md-2 d-flex align-items-end">
              <button class="btn btn-primary w-100" @click="doSearch">Search</button>
            </div>
          </div>
        </div>
        <div v-if="searchResults.length === 0" class="empty-state"><div class="icon">🔍</div><p>No results yet</p></div>
        <div v-for="r in searchResults" :key="r.id" class="glass-card mb-2">
          <div class="d-flex justify-content-between">
            <span style="font-size:12px;color:var(--accent);font-weight:600">{{ r.type.toUpperCase() }}</span>
            <span style="font-size:12px;color:var(--text-dim)">#{{ r.id }}</span>
          </div>
          <div style="margin-top:4px;font-size:14px">{{ r.details }}</div>
        </div>
      </div>

      <!-- EXPORT TAB -->
      <div v-if="tab==='export'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Export & Reports</h4>
        <div class="row g-4">
          <div class="col-md-6">
            <div class="glass-card h-100">
              <h6 style="font-weight:700;margin-bottom:1rem">📊 CSV Export — Closed Requests</h6>
              <p style="color:var(--text-muted);font-size:13px;margin-bottom:1.5rem">Export all closed/completed service requests as CSV.</p>
              <button class="btn btn-primary mb-3" @click="triggerCsv" :disabled="csvStatus==='pending'">
                <i class="bi bi-file-earmark-spreadsheet me-2"></i>
                {{ csvStatus === 'pending' ? 'Generating…' : 'Trigger CSV Export' }}
              </button>
              <div v-if="csvStatus==='ready'" class="d-flex gap-2">
                <button class="btn btn-success btn-sm" @click="downloadCsv">⬇️ Download CSV</button>
              </div>
              <div v-if="csvStatus" style="margin-top:8px;font-size:12px;color:var(--text-muted)">Status: {{ csvStatus }}</div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="glass-card h-100">
              <h6 style="font-weight:700;margin-bottom:1rem">📋 Monthly Activity Report</h6>
              <p style="color:var(--text-muted);font-size:13px;margin-bottom:1.5rem">Generate an HTML report for all customers this month. (Also runs automatically on 1st of every month)</p>
              <button class="btn btn-success mb-3" @click="triggerReport">
                <i class="bi bi-file-earmark-richtext me-2"></i> Generate Now
              </button>
              <div v-if="reportTaskId" style="font-size:12px;color:var(--text-muted)">Task ID: {{ reportTaskId }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUMMARY TAB -->
      <div v-if="tab==='summary'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Analytics Summary</h4>
        <div class="row g-4 mb-4">
          <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-num" style="color:var(--accent)">{{ summaryData.totals.services }}</div><div class="stat-label">Services</div></div></div>
          <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-num" style="color:var(--accent2)">{{ summaryData.totals.professionals }}</div><div class="stat-label">Professionals</div></div></div>
          <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-num" style="color:var(--accent3)">{{ summaryData.totals.requests }}</div><div class="stat-label">Total Requests</div></div></div>
        </div>
        <div class="row g-4">
          <div class="col-md-5">
            <div class="glass-card">
              <h6 style="font-weight:700;margin-bottom:1rem">Services by Category</h6>
              <canvas ref="catChartRef" height="200"></canvas>
            </div>
          </div>
          <div class="col-md-7">
            <div class="glass-card">
              <h6 style="font-weight:700;margin-bottom:1rem">Professional Average Ratings</h6>
              <canvas ref="ratingChartRef" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SERVICE MODAL -->
    <div class="modal fade" id="svcModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ svcForm.id ? 'Edit Service' : 'New Service' }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div v-if="svcError" class="alert alert-danger mb-3">{{ svcError }}</div>
          <div class="mb-3"><label class="form-label">Name</label><input v-model="svcForm.name" class="form-control" required /></div>
          <div class="mb-3"><label class="form-label">Category</label>
            <select v-model="svcForm.category" class="form-select">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="mb-3"><label class="form-label">Base Price (₹)</label><input v-model="svcForm.base_price" type="number" class="form-control" /></div>
          <div class="mb-3"><label class="form-label">Time Required</label><input v-model="svcForm.time_required" class="form-control" placeholder="e.g. 2 hours" /></div>
          <div class="mb-3"><label class="form-label">Description</label><textarea v-model="svcForm.description" class="form-control" rows="2"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button class="btn btn-primary" @click="saveSvc">{{ svcForm.id ? 'Update' : 'Create' }}</button>
        </div>
      </div></div>
    </div>
  </div>
  `,
  data: () => ({
    sideItems: [
      { t: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { t: 'services', icon: '🛠', label: 'Services' },
      { t: 'professionals', icon: '👷', label: 'Professionals' },
      { t: 'customers', icon: '👥', label: 'Customers' },
      { t: 'requests', icon: '📋', label: 'Requests' },
      { t: 'search', icon: '🔍', label: 'Search' },
      { t: 'export', icon: '📁', label: 'Export' },
      { t: 'summary', icon: '📊', label: 'Summary' },
    ],
    statItems: [
      { key: 'services', label: 'Services', color: 'var(--accent)' },
      { key: 'professionals', label: 'Professionals', color: 'var(--accent2)' },
      { key: 'customers', label: 'Customers', color: 'var(--accent3)' },
      { key: 'requests', label: 'Requests', color: '#a78bfa' },
    ],
    categories: ['AC Repair', 'Cleaning', 'Electrician', 'Plumbing', 'Salon', 'Pest Control'],
  }),
};
