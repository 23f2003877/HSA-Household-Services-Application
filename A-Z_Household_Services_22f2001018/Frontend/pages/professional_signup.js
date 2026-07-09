export default {
    template: `
        <div class="d-flex justify-content-center align-items-center vh-100">
            <div class="container border border-dark rounded p-4" style="max-width: 400px;">
                <h2 class="text-primary text-center">Service Professional Signup</h2>
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
                        <label for="service">Service Category:</label>
                        <select id="service" v-model="service" class="form-control" required>
                            <option value="">Select available services</option>
                            <option value="plumbing">Plumbing</option>
                            <option value="electrician">Electrician</option>
                            <option value="cleaning">Cleaning</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="experience">Experience (in yrs):</label>
                        <input type="number" id="experience" v-model="experience" class="form-control" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="address">Address:</label>
                        <textarea id="address" v-model="address" class="form-control" rows="3" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="pincode">Pin Code:</label>
                        <input type="text" id="pincode" v-model="pincode" class="form-control" required>
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
            service: null,
            experience: null,
            address: null,
            pincode: null,
            message: null,
            category: null,
        };
    },
    methods: {
        async submitRegister() {
            try {
                const res = await fetch(location.origin + '/register/professional', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: this.email,
                        password: this.password,
                        fullname: this.fullname,
                        service: this.service,
                        experience: this.experience,
                        address: this.address,
                        pincode: this.pincode
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    this.message = data.message;
                    this.category = data.category;
                } else {
                    const errorData = await res.json();
                    this.message = errorData.message;
                    this.category = errorData.category;
                }
            } catch (error) {
                this.message = 'An unexpected error occurred.';
                this.category = 'danger';
            }
        }
    }
}
