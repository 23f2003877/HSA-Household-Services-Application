export default {
    template: `
    <div class="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div class="container border border-dark rounded-3 p-4" style="max-width: 350px;">
            <h2 class="text-center">Household Services</h2>
            
            <div class="form-group justify-content-center text-primary">
                <router-link to="/login">Login</router-link>
            </div>
            <div class="form-group justify-content-center text-primary">
                <router-link to="/register/professional">Professional Signup</router-link>
            </div>
            <div class="form-group justify-content-center text-primary">
                <router-link to="/register/customer">Customer Signup</router-link>
            </div>
            
        </div>    
    </div>
    `,
}