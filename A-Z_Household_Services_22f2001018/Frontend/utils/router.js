import home from "../pages/home.js";
import login from "../pages/login.js";
import customer_signup from "../pages/customer_signup.js";
import professional_signup from "../pages/professional_signup.js";
import admin_dashboard from "../pages/admin_dashboard.js";
import admin_update from "../pages/admin_update.js";
import admin_search from "../pages/admin_search.js";
import admin_service from "../pages/admin_service.js";
import admin_summary from "../pages/admin_summary.js";
import admin_report_page from "../pages/admin_report_page.js";
import customer_dashboard from "../pages/customer_dashboard.js";
import customer_search from "../pages/customer_search.js";
import customer_request_service from "../pages/customer_request_service.js";
import customer_requested_service from "../pages/customer_requested_service.js";
import customer_review from "../pages/customer_review.js";
import professional_dashboard from "../pages/professional_dashboard.js";
import professional_search from "../pages/professional_search.js";
import professional_summary from "../pages/professional_summary.js";

const routes = [
    {path : '/', component : home},
    {path : '/login', component : login},
    {path : '/register/customer', component : customer_signup},
    {path : '/register/professional', component : professional_signup},
    {path : '/admin/dashboard', component: admin_dashboard },
    { path: '/admin/services/update/:id', component: admin_update, props: true },
    {path : '/admin/search', component: admin_search },
    {path : '/admin/services', component: admin_service },
    {path : '/admin/summary', component: admin_summary },
    {path : '/admin/downloadReport', component: admin_report_page },
    {path : '/customer/dashboard', component: customer_dashboard },
    {path : '/customer/search', component: customer_search }, 
    {path : '/customer/request-service', component: customer_request_service },
    {path : '/customer/requested-services', component: customer_requested_service },
    {path : '/customer/submit_rating', component: customer_review },
    {path : '/professional/dashboard', component: professional_dashboard },
    {path : '/professional/search', component: professional_search }, 
    {path : '/professional/summary', component: professional_summary },
    {path : '/logout', component : {
        template : `
        <div>
            <h3>Logging out...</h3>
        </div>
        `,
        mounted() {
            this.$root.logout();
        }
    }}
]

const router = new VueRouter({
    routes
})

export default router;