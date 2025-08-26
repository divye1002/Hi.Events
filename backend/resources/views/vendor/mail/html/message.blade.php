<x-mail::layout>
    {{-- Header --}}
    <x-slot:header>
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://lh3.googleusercontent.com/chat_attachment/AP1Ws4tJL1sXjdCfLqzB18F-VZbU-tiFiZtR-2S7SBFxdBg51cFJmfYyomDMcntKNZbpqHKMpglICWD7nlYLOQ983pG_M6unyPaEyVPdTg2gj2_rdrZfwuPt3d3-9eoZKFgE9qqAxRIXcgeA-LRemJA-95gDNw4DsXnU-8vl8nuWB40BL6Xt-3bCnletVa6RVsDUJkC48Z2uBfEHeY3Z_hPt2FhQeDCFh4P54520fy6A_KJQkf-EfKqOmNkhPoJWNZDA29j6GaCZZiBMSeDRlH5jG7FEMK1xZEsyPhR-iArsw7WKHvicRP0pbT2scaEtLPW6jp4=w512" class="logo" alt="Event Logo"
              style="max-width: 300px;">
        </div>
    </x-slot:header>

    {{-- Body --}}
    {{ $slot }}

    {{-- Subcopy --}}
    @isset($subcopy)
        <x-slot:subcopy>
            <x-mail::subcopy>
                {{ $subcopy }}
            </x-mail::subcopy>
        </x-slot:subcopy>
    @endisset

    {{-- Footer --}}
    <x-slot:footer>
        <x-mail::footer>
            @if($appEmailFooter = config('app.email_footer_text'))
                {{ $appEmailFooter }}
            @else
                {{-- (c) Hi.Events Ltd 2025 --}}
                {{-- PLEASE NOTE: --}}
                {{-- Hi.Events is licensed under the GNU Affero General Public License (AGPL) version 3. --}}
                {{-- You can find the full license text at: https://github.com/HiEventsDev/hi.events/blob/main/LICENSE --}}
                {{-- In accordance with Section 7(b) of the AGPL, we ask that you retain the "Powered by Hi.Events" notice. --}}
                {{-- If you wish to remove this notice, a commercial license is available at: https://hi.events/licensing --}}

                © {{ date('Y') }} {{ config('app.name') }} | Powered by <a title="Manage events and sell tickets online with Hi.Events" href="https://hi.events?utm_source=app-email-footer">Hi.Events</a>
            @endif
        </x-mail::footer>
    </x-slot:footer>
</x-mail::layout>
