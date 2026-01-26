<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">
        <form action="${url.registrationAction}" method="post" class="space-y-6">
            <!-- First Name -->
            <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
                    ${msg("firstName")}
                </label>
                <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value="${(register.formData.firstName!'')}"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            <!-- Last Name -->
            <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
                    ${msg("lastName")}
                </label>
                <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value="${(register.formData.lastName!'')}"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            <!-- Email -->
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                    ${msg("email")}
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value="${(register.formData.email!'')}"
                    autocomplete="email"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            <!-- Username (if not using email as username) -->
            <#if !realm.registrationEmailAsUsername>
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                        ${msg("username")}
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        value="${(register.formData.username!'')}"
                        autocomplete="username"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                </div>
            </#if>

            <!-- Password -->
            <#if passwordRequired??>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                        ${msg("password")}
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autocomplete="new-password"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                </div>

                <!-- Password Confirm -->
                <div>
                    <label for="password-confirm" class="block text-sm font-medium text-gray-700 mb-2">
                        ${msg("passwordConfirm")}
                    </label>
                    <input
                        id="password-confirm"
                        name="password-confirm"
                        type="password"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                </div>
            </#if>

            <!-- Buttons -->
            <div class="space-y-3">
                <button
                    type="submit"
                    class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                    ${msg("doRegister")}
                </button>

                <a
                    href="${url.loginUrl}"
                    class="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
                >
                    ${msg("backToLogin")}
                </a>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>