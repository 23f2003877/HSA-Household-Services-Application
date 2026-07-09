export default {
  template: `
    <div>
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">Requested Services</div>
        <div class="card-body">
          <!-- Error Message -->
          <div v-if="error" class="alert alert-danger">{{ error }}</div>

          <!-- Loading State -->
          <div v-if="loading" class="alert alert-info">Loading services...</div>

          <div v-for="(services, status) in categorizedServices" :key="status">
            <h4 class="text-primary">{{ status }} Services</h4>
            <div v-if="services.length">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Professional Name</th>
                    <th>Professional Email</th>
                    <th>Location</th>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Date Requested</th>
                    <th>Status</th>
                    <th v-if="status === 'Pending'">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="service in services" :key="service.id">
                    <td>{{ service.id }}</td>
                    <td>{{ service.professional_name }}</td>
                    <td>{{ service.professional_email }}</td>
                    <td>{{ service.customer_address }}</td>
                    <td>{{ service.service_name }}</td>
                    <td>{{ service.category }}</td>
                    <td>{{ formatDate(service.request_date) }}</td>
                    <td>{{ service.status }}</td>
                    <td v-if="status === 'Pending'">
                      <button @click="deleteServiceRequest(service.id)" class="btn btn-danger btn-sm">
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else>No {{ status }} services found.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      categorizedServices: {},
      error: null,
      loading: false,
    };
  },
  async created() {
    await this.fetchRequestedServices();
  },
  methods: {
    async fetchRequestedServices() {
      this.loading = true;
      this.error = null;
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          this.error = "Token is missing";
          return;
        }

        const res = await fetch(`${location.origin}/customer/requested-services`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          this.error = errorData.message || "Unknown error";
          return;
        }

        const data = await res.json();
        if (data && data.categorized_services) {
          this.categorizedServices = data.categorized_services || {};
        } else {
          this.error = "Error: No categorized services in the response.";
        }
      } catch (error) {
        this.error = "Unexpected error: " + error.message;
      } finally {
        this.loading = false;
      }
    },
    async deleteServiceRequest(serviceId) {
      if (!confirm("Are you sure you want to delete this service request?")) {
        return;
      }

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          this.error = "Token is missing";
          return;
        }

        const res = await fetch(`${location.origin}/customer/delete/${serviceId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          this.error = errorData.message || "Failed to delete service request.";
          return;
        }

        this.categorizedServices.Pending = this.categorizedServices.Pending.filter(
          (service) => service.id !== serviceId
        );

        alert("Service request deleted successfully.");
      } catch (error) {
        this.error = "Unexpected error: " + error.message;
      }
    },
    formatDate(dateString) {
      const options = { year: "numeric", month: "2-digit", day: "2-digit" };
      return new Date(dateString).toLocaleDateString(undefined, options);
    },
  },
};
