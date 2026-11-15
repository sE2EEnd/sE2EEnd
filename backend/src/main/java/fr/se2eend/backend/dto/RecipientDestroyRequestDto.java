package fr.se2eend.backend.dto;

/**
 * Body of the recipient destroy request. The token is derived client-side from the send key
 * (never the key itself) and travels in the body so it stays out of URLs and access logs.
 */
public record RecipientDestroyRequestDto(String token) {
    @Override
    public String toString() {
        return "RecipientDestroyRequestDto[token=<redacted>]";
    }
}
