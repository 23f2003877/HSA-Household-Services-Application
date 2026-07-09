export default {
    template: `
        <div class="d-flex justify-content-center align-items-center vh-100">
            <div class="container border border-dark rounded p-4" style="max-width: 400px;">
                <h2 class="text-primary text-center">Customer Signup</h2>
                <div v-if="message" :class="'alert alert-' + category" role="alert">
                    {{ message }}
                </div>
                <form @submit.prevent="submitRegister">
                    <div class="form-group">
                        <label for="email">Email ID (Username):</label>
                        <input type="text" id="email" v-model="email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" v-model="password" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="fullname">Fullname:</label>
                        <input type="text" id="fullname" v-model="fullname" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="address">Address:</label>
                        <textarea id="address" v-model="address" class="form-control" rows="3" required></textarea>
                    </div>
                    <div class="d-flex justify-content-center">
                        <button type="submit" class="btn btn-primary mt-3">Register</button>
                    </div>
                    <router-link to="/login" class="d-block mt-3 text-center text-primary">Login here</router-link>
                </form>
            </div>
        </div>
    `,
    data() {
        return {
            email: null,
            password: null,
            fullname: null,
            address: null,
            message: null,
            category: null,
        };
    },
    methods: {
        async submitRegister() {
            try {
                const res = await fetch(location.origin + '/register/customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: this.email,
                        password: this.password,
                        fullname: this.fullname,
                        address: this.address,
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    this.message = data.message;
                    this.category = 'success';
                } else {
                    const errorData = await res.json();
                    this.message = errorData.message;
                    this.category = 'danger';
                }
            } catch (error) {
                this.message = 'An unexpected error occurred.';
                this.category = 'danger';
            }
        },
    },
};
