export default {
    template: `
    <div class="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div class="container border border-dark rounded-3 p-4" style="max-width: 350px;">
            <h2 class="text-center text-primary">Household Services</h2>
            <div v-if="message" :class="'alert alert-' + category" role="alert">
                {{ message }}
            </div>
            <form @submit.prevent="submitLogin">
                <div class="mb-3">
                    <label for="role" class="form-label">Select Role:</label>
                    <select id="role" v-model="role" class="form-select" required>
                        <option value="" disabled>Select your role</option>
                        <option value="customer">Customer</option>
                        <option value="professional">Professional</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div class="mb-3">
                    <label for="username" class="form-label">Email/Username:</label>
                    <input type="text" id="username" v-model="username" class="form-control" required>
                </div>
    
                <div class="mb-3">
                    <label for="password" class="form-label">Password:</label>
                    <input type="password" id="password" v-model="password" class="form-control" required>
                </div>
    
                <button type="submit" class="btn btn-primary w-100 mt-3">Login</button>
                
                <div class="mt-3 text-center">
                    <router-link to="/register/customer" class="text-secondary" style="font-size: 14px;">Create Account?</router-link><br>
                    <router-link to="/register/professional" class="text-success" style="font-size: 14px;">Register as Professional</router-link>
                </div>
            </form>
        </div>
    </div>
    `,
    data() {
        return {
            username: '',
            password: '',
            role: '',
            message: null,
            category: null,
        };
    },
    methods: {
        async submitLogin() {
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: this.username,
                        password: this.password,
                        role: this.role
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    this.message = data.message || 'Login failed';
                    this.category = 'danger';
                    return;
                }

                // Store token in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user_role', data.role);
                localStorage.setItem('user_id', data.id);

                this.$root.login(data.role, data.id);

                const redirectRoutes = {
                    customer_dashboard: '/customer/dashboard',
                    professional_dashboard: '/professional/dashboard',
                    admin_dashboard: '/admin/dashboard'
                };

                this.$router.push(redirectRoutes[data.redirect] || '/login');

            } catch (error) {
                console.error(error);
                this.message = 'An unexpected error occurred';
                this.category = 'danger';
            }
        }
    }
};
