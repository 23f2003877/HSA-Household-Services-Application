export default {
    template: `
    <div class="container mt-4">
        <section v-for="(services, status) in groupedServices" :key="status">
            <h2 class="text-primary">{{ status }} Services</h2>
            <table class="table table-bordered table-striped mt-3">
                <thead :class="tableClass(status)">
                    <tr>
                        <th>#</th>
                        <th>Customer Name</th>
                        <th>Contact Email</th>
                        <th>Location</th>
                        <th>Service</th>
                        <th>Category</th>
                        <th>Date Requested</th>
                        <th>Status</th>
                        <th v-if="status === 'Pending' || status === 'Accepted'">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="service in services" :key="service.id">
                        <td>{{ service.id }}</td>
                        <td>{{ getCustomer(service, status).name }}</td>
                        <td>{{ getCustomer(service, status).email }}</td>
                        <td>{{ getCustomer(service, status).address }}</td>
                        <td>{{ getServiceInfo(service, status).name }}</td>
                        <td>{{ getServiceInfo(service, status).category }}</td>
                        <td>{{ formatDate(service.request_date) }}</td>
                        <td>{{ service.status }}</td>
                        <td v-if="status === 'Pending' || status === 'Accepted'" class="text-center">
                            <button v-if="status === 'Pending'" @click="updateRequestStatus('accepted', service.id)" class="btn btn-success btn-sm">Accept</button>
                            <button v-if="status === 'Pending'" @click="updateRequestStatus('rejected', service.id)" class="btn btn-danger btn-sm">Reject</button>
                            <button v-if="status === 'Accepted'" @click="updateRequestStatus('completed', service.id)" class="btn btn-warning btn-sm">Complete</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </div>
    `,
    data() {
        return {
            groupedServices: {
                "Pending": [],
                "Accepted": [],
                "Completed": [],
                "Rejected": []
            },
            customers: {},
            servicesDict: {}
        };
    },
    mounted() {
        this.fetchDashboardData();
    },
    methods: {
        async fetchDashboardData() {
            try {
                const res = await fetch(`${location.origin}/professional/dashboard`, {
                    method: 'GET', 
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')  // Ensure token is included
                    }
                });
        
                if (res.ok) {
                    const data = await res.json();
                    this.groupedServices.Pending = data.pending_services;
                    this.groupedServices.Accepted = data.accepted_services;
                    this.groupedServices.Completed = data.completed_services;
                    this.groupedServices.Rejected = data.rejected_services;
                    this.customers = { 
                        ...data.pending_customers,
                        ...data.accepted_customers,
                        ...data.completed_customers,
                        ...data.rejected_customers 
                    };
                    this.servicesDict = { 
                        ...data.pending_services_dict,
                        ...data.accepted_services_dict,
                        ...data.completed_services_dict,
                        ...data.rejected_services_dict 
                    };
                } else {
                    console.error("Error fetching data");
                }
            } catch (error) {
                console.error("Error: ", error);
            }
        }
        ,
        async updateRequestStatus(status, serviceId) {
            try {
                const res = await fetch(`${location.origin}/professional/update_request_status/${status.toLowerCase()}/${serviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                if (res.ok) {
                    this.fetchDashboardData();
                } else {
                    console.error("Error updating status");
                }
            } catch (error) {
                console.error("Error: ", error);
            }
        },
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US');
        },
        getCustomer(service, status) {
            return this.customers[service.id] || { name: 'Unknown', email: 'Unknown', address: 'Unknown' };
        },
        getServiceInfo(service, status) {
            return this.servicesDict[service.id] || { name: 'Unknown', category: 'Unknown' };
        },
        tableClass(status) {
            return {
                "Pending": "table-primary",
                "Accepted": "table-info",
                "Completed": "table-success",
                "Rejected": "table-danger"
            }[status] || "table-secondary";
        }
    }
};
