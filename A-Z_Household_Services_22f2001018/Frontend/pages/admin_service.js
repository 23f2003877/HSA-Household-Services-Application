export default {
    props: {
        editing: {
            type: Boolean,
            default: false
        },
        id: {
            type: [String, Number],
            default: null
        }
    },
    data() {
        return {
            service: {
                id: this.id,
                category: '',  // Updated from service_type
                name: '',
                description: '',
                base_price: '' // Updated from price
            },
            message: null,
            categoryClass: null
        };
    },
    created() {
        if (this.editing && this.id) {
            this.fetchServiceData();
        }
    },
    methods: {
        async fetchServiceData() {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    this.message = 'Unauthorized. Please log in.';
                    this.categoryClass = 'danger';
                    return;
                }

                const response = await fetch(`/admin/services/get/${this.id}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.service = {
                        id: data.id,
                        category: data.category,  // Fixed key
                        name: data.name,
                        description: data.description,
                        base_price: data.base_price  // Fixed key
                    };
                } else {
                    this.message = 'Failed to load service data';
                    this.categoryClass = 'danger';
                }
            } catch (error) {
                this.message = 'An error occurred while fetching the service data';
                this.categoryClass = 'danger';
            }
        },
        async submitForm() {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    this.message = 'Unauthorized. Please log in.';
                    this.categoryClass = 'danger';
                    return;
                }

                const url = this.editing
                    ? `/admin/services/update/${this.service.id}`
                    : '/admin/services/create';
                
                const response = await fetch(url, {
                    method: this.editing ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(this.service)
                });

                if (response.ok) {
                    this.message = this.editing ? 'Service updated successfully!' : 'Service created successfully!';
                    this.categoryClass = 'success';
                    this.$router.push('/admin/dashboard');
                } else {
                    const errorData = await response.json();
                    this.message = errorData.message || 'An error occurred.';
                    this.categoryClass = 'danger';
                }
            } catch (error) {
                this.message = 'An unexpected error occurred.';
                this.categoryClass = 'danger';
            }
        }
    },
    template: `
        <div class="row">
            <div class="col-md-4 offset-md-4">
                <h3>{{ editing ? 'Edit Service' : 'New Service' }}</h3>
                
                <div v-if="message" :class="'alert alert-' + categoryClass" role="alert">
                    {{ message }}
                </div>

                <form @submit.prevent="submitForm">
                    <div class="form-group">
                        <label for="category">Category</label>
                        <select id="category" v-model="service.category" class="form-control" required>
                            <option value="cleaning">Cleaning</option>
                            <option value="electrical">Electrician</option>
                            <option value="plumbing">Plumbing</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="name">Name</label>
                        <input type="text" id="name" v-model="service.name" class="form-control" required>
                    </div>

                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" v-model="service.description" class="form-control" required></textarea>
                    </div>

                    <div class="form-group">
                        <label for="base_price">Base Price</label>
                        <input type="number" id="base_price" v-model="service.base_price" class="form-control" required>
                    </div>

                    <div class="form-group text-center">
                        <button type="submit" class="btn btn-primary btn-sm">Submit</button>
                        <router-link to="/admin/dashboard" class="btn btn-secondary btn-sm">Cancel</router-link>
                    </div>
                </form>
            </div>
        </div>
    `
};
