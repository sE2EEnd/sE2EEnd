<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/login.css">
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);" class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-white mb-2">${kcSanitize(msg("loginTitleHtml",(realm.displayNameHtml!'')))?no_esc}</h1>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-xl shadow-2xl p-8">
            <!-- Alerts -->
            <#if displayMessage && message??>
                <#if message.type = 'success'>
                    <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
                        ${kcSanitize(message.summary)?no_esc}
                    </div>
                <#elseif message.type = 'error'>
                    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
                        ${kcSanitize(message.summary)?no_esc}
                    </div>
                <#elseif message.type = 'warning'>
                    <div class="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                        ${kcSanitize(message.summary)?no_esc}
                    </div>
                <#else>
                    <div class="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                        ${kcSanitize(message.summary)?no_esc}
                    </div>
                </#if>
            </#if>

            <!-- Form Content -->
            <#nested "form">

            <!-- Register Link -->
            <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
                <div class="mt-6 text-center">
                    <span class="text-gray-600 text-sm">${msg("noAccount")}</span>
                    <a href="${url.registrationUrl}" class="ml-2 font-semibold text-white text-sm px-4 py-2 rounded-lg transition-all inline-block hover:shadow-lg hover:-translate-y-0.5" style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);">${msg("doRegister")}</a>
                </div>
            </#if>
        </div>
    </div>
</body>
</html>
</#macro>