export default {
    data() {
        return {
            services: [],
            professionals: [],
            categories: []
        };
    },
    template: `
    <div class="container-fluid mt-4">
        <div class="card mb-4">
            <div class="card-body">
                <h2 class="card-title">Manage Services</h2>
                <div class="d-flex justify-content-end mb-3">
                    <router-link to="/admin/services" class="btn btn-outline-success">Create Service</router-link>
                    <button @click="create_csv"> Service Request (CSV) </button>
                </div>
                <table class="table table-striped">
                    <thead class="thead-dark">
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Base Price</th>
                            <th>Category</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="service in services" :key="service.id">
                            <td>{{ service.id }}</td>
                            <td>{{ service.name }}</td>
                            <td>{{ service.description }}</td>
                            <td>{{ service.base_price }}</td>
                            <td>{{ service.category }}</td>
                            <td>
                                <router-link :to="'/admin/services/update/' + service.id" class="btn btn-warning btn-sm">Edit</router-link>
                                <button @click="deleteService(service.id)" class="btn btn-danger btn-sm">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <h3 class="mt-4">Manage Professionals</h3>
                <table class="table table-bordered">
                    <thead class="thead-dark">
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="professional in professionals" :key="professional.id">
                            <td>{{ professional.id }}</td>
                            <td>{{ professional.fullname }}</td>
                            <td>{{ professional.email }}</td>
                            <td>{{ professional.status }}</td>
                            <td>
                                <button @click="manageProfessional(professional.id, 'accept')" class="btn btn-primary btn-sm">Accept</button>
                                <button @click="manageProfessional(professional.id, 'block')" class="btn btn-warning btn-sm">Block</button>
                                <button @click="manageProfessional(professional.id, 'reject')" class="btn btn-danger btn-sm">Reject</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `,
    mounted() {
        this.fetchAdminDashboard();
    },
    methods: {
        async fetchAdminDashboard() {
            const token = localStorage.getItem('token');
            if (!token) {
                alert("You are not logged in. Please log in first.");
                this.$router.push('/login'); // Redirect to login page
                return;
            }
        
            try {
                const res = await fetch(location.origin + '/admin/dashboard', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                });
        
                if (res.ok) {
                    const data = await res.json();
                    this.services = data.services || [];
                    this.professionals = data.professionals || [];
                    this.categories = data.categories || [];
                } else {
                    console.log("Error fetching data:", res.status);
                    alert("Unauthorized access. Please log in again.");
                    this.$router.push('/login'); // Redirect to login page
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        },
        async create_csv() {
            const token = localStorage.getItem('token');
            if (!token) {
                alert("You are not logged in. Please log in first.");
                this.$router.push('/login');
                return;
            }
        
            try {
                const res = await fetch(`${location.origin}/create-csv`, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
        
                if (!res.ok) {
                    console.error("Error initiating CSV creation:", res.status);
                    alert("Failed to create CSV. Please try again.");
                    return;
                }
        
                const { task_id } = await res.json();
        
                const checkStatus = async () => {
                    try {
                        const res = await fetch(`${location.origin}/get-csv/${task_id}`);
                        
                        if (res.ok) {
                            console.log('CSV is ready for download.');
                            window.open(`${location.origin}/get-csv/${task_id}`);
                            return;
                        } 
                    } catch (error) {
                        console.error("Error checking CSV status:", error);
                    }
                    setTimeout(checkStatus, 2000); // Check every 2 seconds
                };
        
                checkStatus();
            } catch (error) {
                console.error("Error creating CSV:", error);
                alert("An error occurred while creating the CSV. Please try again.");
            }
        },
                
        async deleteService(serviceId) {
            if (!confirm("Are you sure you want to delete this service?")) return;
            try {
                const response = await fetch(`/admin/services/delete/${serviceId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                if (response.ok) {
                    alert("Service deleted successfully!");
                    this.services = this.services.filter(service => service.id !== serviceId);
                } else {
                    alert("Failed to delete service.");
                }
            } catch (error) {
                console.error("Error deleting service:", error);
            }
        },

        async manageProfessional(professionalId, action) {
            try {
                const response = await fetch(`/admin/manage-professionals/${professionalId}/${action}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                if (response.ok) {
                    alert(`Professional ${action}ed successfully!`);
                    this.fetchAdminDashboard();
                } else {
                    alert(`Failed to ${action} professional.`);
                }
            } catch (error) {
                console.error(`Error managing professional:`, error);
            }
        },

        exportCSV() {
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "ID,Name,Description,Base Price,Category\n";
            this.services.forEach(service => {
                csvContent += `${service.id},${service.name},${service.description},${service.base_price},${service.category}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "services.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};
