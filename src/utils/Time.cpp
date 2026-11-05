#include "Time.h"

#include <SDL2/SDL.h>
#include <chrono>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

namespace Time {
int64_t currentTimeMillis()
{
    return std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count();
}

void sleep(int64_t ms)
{
#ifdef __EMSCRIPTEN__
    emscripten_sleep(ms);
#else
    SDL_Delay(ms);
#endif
}
}
